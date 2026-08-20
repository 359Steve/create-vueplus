import type { WebSocketManagerOptions } from './types';

/** 解析 WebSocket 原始消息并提取消息主题 */
export class WebSocketMessageProcessor {
    /** 消息处理相关配置 */
    private readonly options: WebSocketManagerOptions;

    /** 创建消息处理器 */
    constructor(options: WebSocketManagerOptions) {
        this.options = options;
    }

    /** 使用自定义或默认规则解析原始消息 */
    async parse(data: unknown): Promise<unknown> {
        if (this.options.parseMessage) return await this.options.parseMessage(data);

        const text = data instanceof Blob ? await data.text() : data;
        if (typeof text !== 'string') return text;

        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }

    /** 使用自定义或默认字段提取消息主题 */
    getTopic(message: unknown): string | undefined {
        if (this.options.getMessageTopic) return this.options.getMessageTopic(message);
        if (!message || typeof message !== 'object') return undefined;

        const envelope = message as Record<string, unknown>;
        for (const key of ['topic', 'type', 'event']) {
            if (typeof envelope[key] === 'string') return envelope[key];
        }
        return undefined;
    }
}
