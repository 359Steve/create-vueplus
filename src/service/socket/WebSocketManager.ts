import type {
    WebSocketEventHandler,
    WebSocketEventName,
    WebSocketManagerOptions,
    WebSocketPayload,
    WebSocketStatus,
} from './types';
import { getReconnectDelay } from './reconnect';
import { DEFAULT_QUEUE_LIMIT } from './types';
import { WebSocketEventBus } from './WebSocketEventBus';
import { WebSocketHeartbeat } from './WebSocketHeartbeat';
import { WebSocketMessageProcessor } from './WebSocketMessageProcessor';
import { WebSocketMessageQueue } from './WebSocketMessageQueue';

/** 协调 WebSocket 的连接生命周期、重连和消息派发 */
export class WebSocketManager {
    /** 对外事件订阅中心 */
    private readonly events = new WebSocketEventBus();
    /** 断线期间的待发送消息队列 */
    private readonly messageQueue = new WebSocketMessageQueue();
    /** 初始化配置 */
    private readonly options: WebSocketManagerOptions;
    /** 消息解析与主题提取器 */
    private readonly messageProcessor: WebSocketMessageProcessor;
    /** 连接成功后的心跳控制器 */
    private readonly heartbeat: WebSocketHeartbeat;

    /** 当前有效的 WebSocket 实例 */
    private socket: WebSocket | undefined;
    /** 下一次重连的定时器 */
    private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    /** 确保异步消息按接收顺序完成解析 */
    private messageChain: Promise<void> = Promise.resolve();
    /** 当前连续重连次数 */
    private reconnectAttempts = 0;
    /** 业务是否要求连接保持可用 */
    private shouldStayConnected = false;
    /** 当前对外暴露的连接状态 */
    private currentStatus: WebSocketStatus = 'idle';

    /** 创建连接管理器 */
    constructor(options: WebSocketManagerOptions) {
        this.options = options;
        this.messageProcessor = new WebSocketMessageProcessor(options);
        this.heartbeat = new WebSocketHeartbeat(options, (payload) => {
            this.send(payload);
        });
    }

    /** 获取当前连接状态 */
    get status(): WebSocketStatus {
        return this.currentStatus;
    }

    /** 当前连接是否已打开 */
    get isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    /** 建立连接或恢复自动重连 */
    connect(): void {
        this.shouldStayConnected = true;
        this.clearReconnectTimer();

        if (this.socket?.readyState === WebSocket.CONNECTING || this.isConnected) return;
        this.createConnection();
    }

    /** 主动断开并停止重连和心跳 */
    disconnect(code = 1000, reason = 'Client disconnected'): void {
        this.shouldStayConnected = false;
        this.reconnectAttempts = 0;
        this.clearReconnectTimer();
        this.heartbeat.stop();

        const socket = this.socket;
        this.socket = undefined;
        if (socket && socket.readyState < WebSocket.CLOSING) socket.close(code, reason);

        this.setStatus('closed');
    }

    /** 发送原始消息，断线时将消息加入队列 */
    send(message: WebSocketPayload): boolean {
        const socket = this.socket;
        if (socket?.readyState === WebSocket.OPEN) {
            try {
                socket.send(message);
                return true;
            } catch (error) {
                this.emitError(error);
            }
        }

        this.messageQueue.enqueue(message, this.options.messageQueueLimit ?? DEFAULT_QUEUE_LIMIT);
        return false;
    }

    /** 序列化对象后发送 JSON 消息 */
    sendJson<T>(message: T): boolean {
        return this.send(JSON.stringify(message));
    }

    /** 订阅连接生命周期事件并返回取消订阅函数 */
    on<T extends WebSocketEventName>(event: T, handler: WebSocketEventHandler<T>): () => void {
        return this.events.on(event, handler);
    }

    /** 订阅所有已解析的服务端消息 */
    onMessage<T = unknown>(_handler: (_message: T) => void): () => void;
    /** 按消息类型订阅并自动推导消息体类型 */
    onMessage<T extends MessageId>(_messageId: T, _handler: (_message: TypedWebSocketMessage<T>) => void): () => void;
    onMessage<T extends MessageId>(
        messageIdOrHandler: T | ((_message: unknown) => void),
        handler?: (_message: TypedWebSocketMessage<T>) => void,
    ): () => void {
        if (typeof messageIdOrHandler === 'function') {
            return this.on('message', messageIdOrHandler);
        }

        return this.on('message', (message) => {
            if (!this.isMessageOfType(message, messageIdOrHandler)) return;
            handler?.(message);
        });
    }

    /** 按消息主题订阅服务端消息 */
    subscribeTopic<T = unknown>(topic: string, handler: (_message: T) => void): () => void {
        return this.onMessage((message) => {
            if (this.messageProcessor.getTopic(message) === topic) handler(message as T);
        });
    }

    /** 判断消息是否属于指定消息类型 */
    private isMessageOfType<T extends MessageId>(message: unknown, messageId: T): message is TypedWebSocketMessage<T> {
        return Boolean(
            message && typeof message === 'object' && (message as TypedWebSocketMessage<T>).MessageId === messageId,
        );
    }

    /** 创建 WebSocket 实例并绑定原生事件 */
    private createConnection(): void {
        if (!this.shouldStayConnected) return;

        this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');
        try {
            const socket = new WebSocket(this.resolveUrl(), this.options.protocols);
            this.socket = socket;
            socket.onopen = (event) => this.handleOpen(socket, event);
            socket.onclose = (event) => this.handleClose(socket, event);
            socket.onerror = (event) => this.events.emit('error', event);
            socket.onmessage = (event) => this.enqueueMessage(event);
        } catch (error) {
            this.emitError(error);
            this.scheduleReconnect();
        }
    }

    /** 处理连接成功并恢复待发送消息 */
    private handleOpen(socket: WebSocket, event: Event): void {
        if (this.socket !== socket) return;

        this.reconnectAttempts = 0;
        this.setStatus('open');
        this.heartbeat.start();
        this.flushPendingMessages();
        this.events.emit('open', event);
    }

    /** 处理连接关闭并按策略决定是否重连 */
    private handleClose(socket: WebSocket, event: CloseEvent): void {
        if (this.socket !== socket) return;

        this.socket = undefined;
        this.heartbeat.stop();
        this.events.emit('close', event);

        if (this.shouldStayConnected && (this.options.shouldReconnect?.(event) ?? true)) {
            this.scheduleReconnect();
        } else {
            this.setStatus('closed');
        }
    }

    /** 安排下一次指数退避重连 */
    private scheduleReconnect(): void {
        const maxAttempts = this.options.maxReconnectAttempts ?? Number.POSITIVE_INFINITY;
        if (!this.shouldStayConnected || this.reconnectAttempts >= maxAttempts) {
            this.setStatus('closed');
            return;
        }

        const attempt = ++this.reconnectAttempts;
        const delay = getReconnectDelay(this.options, attempt);
        this.setStatus('reconnecting');
        this.events.emit('reconnect', { attempt, delay });
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            this.createConnection();
        }, delay);
    }

    /** 将异步解析任务串行化以保证消息顺序 */
    private enqueueMessage(event: MessageEvent<unknown>): void {
        this.messageChain = this.messageChain
            .then(async () => {
                const message = await this.messageProcessor.parse(event.data);
                this.events.emit('message', message);
            })
            .catch((error: unknown) => this.emitError(error));
    }

    /** 在连接恢复后依次发送缓存消息 */
    private flushPendingMessages(): void {
        this.messageQueue.drain().forEach((message) => this.send(message));
    }

    /** 取消尚未执行的重连任务 */
    private clearReconnectTimer(): void {
        if (this.reconnectTimer === undefined) return;
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = undefined;
    }

    /** 更新状态并仅在状态变化时通知订阅者 */
    private setStatus(status: WebSocketStatus): void {
        if (this.currentStatus === status) return;
        this.currentStatus = status;
        this.events.emit('status', status);
    }

    /** 获取当前应连接的地址 */
    private resolveUrl(): string {
        return typeof this.options.url === 'function' ? this.options.url() : this.options.url;
    }

    /** 将未知异常标准化后通知错误订阅者 */
    private emitError(error: unknown): void {
        this.events.emit('error', error instanceof Event || error instanceof Error ? error : new Error(String(error)));
    }
}
