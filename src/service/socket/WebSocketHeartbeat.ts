import type { WebSocketManagerOptions, WebSocketPayload } from './types';

/** 在连接存活期间按配置发送心跳 */
export class WebSocketHeartbeat {
    /** 心跳定时器 */
    private timer: ReturnType<typeof setInterval> | undefined;
    /** 心跳相关配置 */
    private readonly options: WebSocketManagerOptions;
    /** 实际发送消息的回调 */
    private readonly send: (_payload: WebSocketPayload) => void;

    /** 创建心跳控制器 */
    constructor(options: WebSocketManagerOptions, send: (_payload: WebSocketPayload) => void) {
        this.options = options;
        this.send = send;
    }

    /** 按配置开启心跳任务 */
    start(): void {
        const interval = this.options.heartbeatInterval;
        if (!interval || interval <= 0) return;

        this.stop();
        this.timer = setInterval(() => {
            const payload = this.options.heartbeatPayload;
            this.send(typeof payload === 'function' ? payload() : (payload ?? 'ping'));
        }, interval);
    }

    /** 停止并清理心跳任务 */
    stop(): void {
        if (this.timer === undefined) return;
        clearInterval(this.timer);
        this.timer = undefined;
    }
}
