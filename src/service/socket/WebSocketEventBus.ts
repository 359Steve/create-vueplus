import type { WebSocketEventHandler, WebSocketEventName, WebSocketEvents } from './types';

/** 管理 WebSocket 事件的订阅与广播 */
export class WebSocketEventBus {
    /** 按事件类型存储的订阅回调 */
    private readonly handlers: { [T in WebSocketEventName]: Set<WebSocketEventHandler<T>> } = {
        close: new Set(),
        error: new Set(),
        message: new Set(),
        open: new Set(),
        reconnect: new Set(),
        status: new Set(),
    };

    /** 订阅事件并返回取消订阅函数 */
    on<T extends WebSocketEventName>(event: T, handler: WebSocketEventHandler<T>): () => void {
        const eventHandlers = this.handlers[event] as Set<WebSocketEventHandler<T>>;
        eventHandlers.add(handler);
        return () => eventHandlers.delete(handler);
    }

    /** 向当前事件的全部订阅者广播数据 */
    emit<T extends WebSocketEventName>(event: T, payload: WebSocketEvents[T]): void {
        const eventHandlers = this.handlers[event] as Set<WebSocketEventHandler<T>>;
        eventHandlers.forEach((handler) => {
            try {
                handler(payload);
            } catch (error) {
                console.error(`WebSocket ${event} handler failed`, error);
            }
        });
    }
}
