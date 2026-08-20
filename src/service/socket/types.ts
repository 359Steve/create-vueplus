/** 连接状态 */
export type WebSocketStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

/** WebSocket 支持的消息载荷 */
export type WebSocketPayload = string | BufferSource | Blob;

/** WebSocket 连接管理器配置 */
export interface WebSocketManagerOptions {
    /** WebSocket 服务地址或动态地址获取函数 */
    url: string | (() => string);

    /** 建立连接时声明的子协议 */
    protocols?: string | string[];

    /** 首次重连的等待时间 */
    reconnectInterval?: number;

    /** 单次重连允许的最大等待时间 */
    maxReconnectInterval?: number;

    /** 重连等待时间的指数增长倍率 */
    reconnectDecay?: number;

    /** 重连延迟的随机抖动比例 */
    reconnectJitter?: number;

    /** 最大连续重连次数 */
    maxReconnectAttempts?: number;

    /** 心跳消息的发送间隔 */
    heartbeatInterval?: number;

    /** 固定或动态生成的心跳消息 */
    heartbeatPayload?: WebSocketPayload | (() => WebSocketPayload);

    /** 断线时最多缓存的消息数量 */
    messageQueueLimit?: number;

    /** 自定义原始消息解析器 */
    parseMessage?: (_data: unknown) => unknown | Promise<unknown>;

    /** 自定义消息主题提取规则 */
    getMessageTopic?: (_message: unknown) => string | undefined;

    /** 返回 false 时不进行自动重连 */
    shouldReconnect?: (_event: CloseEvent) => boolean;
}

/** 可订阅的连接事件及对应载荷 */
export interface WebSocketEvents {
    /** 原生连接关闭事件 */
    close: CloseEvent;
    /** 原生错误事件或运行时异常 */
    error: Event | Error;
    /** 已完成解析的服务端消息 */
    message: unknown;
    /** 原生连接打开事件 */
    open: Event;
    /** 已安排重连时的次数和等待时长 */
    reconnect: {
        attempt: number;
        delay: number;
    };
    /** 连接状态发生变化 */
    status: WebSocketStatus;
}

/** 可订阅事件名称 */
export type WebSocketEventName = keyof WebSocketEvents;

/** 与指定事件匹配的订阅回调类型 */
export type WebSocketEventHandler<T extends WebSocketEventName> = (_payload: WebSocketEvents[T]) => void;

/** 默认首次重连等待时间 */
export const DEFAULT_RECONNECT_INTERVAL = 1000;
/** 默认单次重连最大等待时间 */
export const DEFAULT_MAX_RECONNECT_INTERVAL = 30000;
/** 默认重连退避倍率 */
export const DEFAULT_RECONNECT_DECAY = 2;
/** 默认重连延迟抖动比例 */
export const DEFAULT_RECONNECT_JITTER = 0.2;
/** 默认断线消息队列容量 */
export const DEFAULT_QUEUE_LIMIT = 100;
