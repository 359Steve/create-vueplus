import type { WebSocketPayload } from './types';

/** 缓存断线期间待发送的消息并在超限时丢弃最早消息 */
export class WebSocketMessageQueue {
    /** 按发送顺序保存的待发送消息 */
    private readonly messages: WebSocketPayload[] = [];

    /** 将消息入队并限制队列最大长度 */
    enqueue(message: WebSocketPayload, limit: number): void {
        if (limit <= 0) return;

        this.messages.push(message);
        if (this.messages.length > limit) {
            this.messages.splice(0, this.messages.length - limit);
        }
    }

    /** 取出并清空全部待发送消息 */
    drain(): WebSocketPayload[] {
        return this.messages.splice(0);
    }
}
