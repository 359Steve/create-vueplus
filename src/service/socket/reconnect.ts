import type { WebSocketManagerOptions } from './types';
import {
    DEFAULT_MAX_RECONNECT_INTERVAL,
    DEFAULT_RECONNECT_DECAY,
    DEFAULT_RECONNECT_INTERVAL,
    DEFAULT_RECONNECT_JITTER,
} from './types';

/**
 * 计算重连等待时间（指数退避 + 随机抖动）
 * @param options WebSocket 管理器配置
 * @param attempt 当前重连次数
 * @returns 等待时间（毫秒）
 */
export function getReconnectDelay(options: WebSocketManagerOptions, attempt: number): number {
    const initialDelay = options.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL;
    const maxDelay = options.maxReconnectInterval ?? DEFAULT_MAX_RECONNECT_INTERVAL;
    const decay = options.reconnectDecay ?? DEFAULT_RECONNECT_DECAY;
    const jitter = options.reconnectJitter ?? DEFAULT_RECONNECT_JITTER;
    const delay = Math.min(initialDelay * decay ** (attempt - 1), maxDelay);

    return Math.round(delay * (1 + (Math.random() * 2 - 1) * jitter));
}
