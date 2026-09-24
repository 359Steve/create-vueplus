import type FlvJs from 'flv.js';
import flvjs from 'flv.js';

/** FLV 播放器配置选项 */
export interface FlvPlayerOptions {
    /** 是否直播 */
    isLive?: boolean;

    /** 是否自动播放 */
    autoplay?: boolean;

    /** 是否循环 */
    loop?: boolean;

    /** 是否静音 */
    muted?: boolean;

    /** 是否开启 HTTP Range 请求 */
    rangeLoadZeroStart?: boolean;

    /** 是否开启时间戳纠正 */
    fixAudioTimestampGap?: boolean;

    /** 最大重连次数 */
    maxReconnectAttempts?: number;

    /** 重连间隔 */
    reconnectInterval?: number;

    /** flv.js 原始配置 */
    config?: FlvJs.Config;
}

/** FLV 播放器事件回调 */
export interface FlvPlayerEvents {
    /** 开始播放 */
    play?: () => void;
    /** 暂停 */
    pause?: () => void;
    /** 播放结束 */
    ended?: () => void;
    /** 媒体信息已加载 */
    loaded?: () => void;
    /** 播放出错 */
    error?: (_error: unknown) => void;
    /** 开始加载 */
    loading?: () => void;
    /** 正在播放 */
    playing?: () => void;
    /** 缓冲等待 */
    waiting?: () => void;
}

/** 默认播放器配置 */
const DEFAULT_OPTIONS: Required<
    Pick<FlvPlayerOptions, 'isLive' | 'autoplay' | 'loop' | 'muted' | 'maxReconnectAttempts' | 'reconnectInterval'>
> = {
    isLive: true,
    autoplay: true,
    loop: false,
    muted: true,
    maxReconnectAttempts: 5,
    reconnectInterval: 3000,
};

/** FLV 播放器管理类 */
export class FlvPlayer {
    /** flv.js 播放器实例 */
    private player: FlvJs.Player | null = null;
    /** 视频元素 */
    private video: HTMLVideoElement | null = null;
    /** 当前播放地址 */
    private url = '';
    /** 播放器配置 */
    private options: FlvPlayerOptions;
    /** 播放生命周期回调 */
    private events: FlvPlayerEvents = {};
    /** 重连定时器 */
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    /** 已重连次数 */
    private reconnectAttempts = 0;
    /** 是否已销毁 */
    private destroyed = false;

    /**
     * 创建 FLV 播放器实例
     * @param options 播放器配置
     */
    constructor(options: FlvPlayerOptions = {}) {
        this.options = {
            ...DEFAULT_OPTIONS,
            ...options,
        };
    }

    /**
     * 初始化播放器
     * @param video 视频元素
     * @param url 播放地址
     * @param events 事件回调
     * @returns 是否初始化成功
     */
    init(video: HTMLVideoElement, url: string, events: FlvPlayerEvents = {}): boolean {
        this.video = video;
        this.url = url;
        this.events = events;
        this.destroyed = false;

        video.autoplay = this.options.autoplay ?? true;
        video.loop = this.options.loop ?? false;
        video.muted = this.options.muted ?? true;
        video.controls = false;
        video.playsInline = true;

        return this.createPlayer();
    }

    /**
     * 创建播放器实例
     * @returns 是否创建成功
     */
    private createPlayer(): boolean {
        if (!this.video || !this.url) {
            return false;
        }

        if (!flvjs.isSupported()) {
            console.error('[FlvPlayer] 当前浏览器不支持 flv.js');
            this.events.error?.(new Error('当前浏览器不支持 flv.js'));
            return false;
        }

        this.destroyPlayer();

        const mediaDataSource: FlvJs.MediaDataSource = {
            type: 'flv',
            url: this.url,
            isLive: this.options.isLive,
        };

        this.player = flvjs.createPlayer(mediaDataSource, this.options.config);

        this.bindPlayerEvents();

        this.player.attachMediaElement(this.video);

        this.player.load();

        return true;
    }

    /**
     * 绑定事件
     */
    private bindPlayerEvents(): void {
        if (!this.player) {
            return;
        }

        this.player.on(flvjs.Events.ERROR, (errorType, errorDetail, errorInfo): void => {
            console.error('[FlvPlayer] error:', errorType, errorDetail, errorInfo);
            this.reconnect(errorType, errorDetail, errorInfo);
        });

        this.player.on(flvjs.Events.LOADING_COMPLETE, (): void => {
            this.events.ended?.();
        });

        this.player.on(flvjs.Events.MEDIA_INFO, (): void => {
            this.events.loaded?.();
        });

        this.video?.addEventListener('play', (): void => {
            this.events.play?.();
        });

        this.video?.addEventListener('pause', (): void => {
            this.events.pause?.();
        });

        this.video?.addEventListener('playing', (): void => {
            this.reconnectAttempts = 0;
            this.events.playing?.();
        });

        this.video?.addEventListener('waiting', (): void => {
            this.events.waiting?.();
        });

        this.video?.addEventListener('loadstart', (): void => {
            this.events.loading?.();
        });
    }

    /**
     * 播放视频
     */
    async play(): Promise<void> {
        if (!this.video) {
            return;
        }

        try {
            await this.video.play();
        } catch (error) {
            console.error('[FlvPlayer] play failed:', error);
            this.events.error?.(error);
        }
    }

    /**
     * 暂停
     */
    pause(): void {
        this.video?.pause();
    }

    /**
     * 切换播放地址
     * @param url 新的播放地址
     */
    switchUrl(url: string): void {
        if (this.url === url) {
            return;
        }

        this.url = url;
        this.reconnectAttempts = 0;

        this.createPlayer();
    }

    /**
     * 自动重连
     * @param errorType 错误类型
     * @param errorDetail 错误详情
     * @param errorInfo 错误信息
     */
    private reconnect(errorType?: unknown, errorDetail?: unknown, errorInfo?: unknown): void {
        const maxAttempts = this.options.maxReconnectAttempts ?? 5;

        if (this.destroyed || this.reconnectAttempts >= maxAttempts) {
            console.error('[FlvPlayer] 达到最大重连次数');
            this.events.error?.({
                errorType,
                errorDetail,
                errorInfo,
            });
            return;
        }

        if (this.reconnectTimer) {
            return;
        }

        this.reconnectAttempts++;

        console.warn(`[FlvPlayer] ${this.options.reconnectInterval}ms 后重连，第 ${this.reconnectAttempts} 次`);

        this.reconnectTimer = setTimeout((): void => {
            this.reconnectTimer = null;

            if (this.destroyed) {
                return;
            }

            this.createPlayer();
        }, this.options.reconnectInterval);
    }

    /**
     * 销毁播放器实例
     */
    private destroyPlayer(): void {
        if (!this.player) {
            return;
        }

        try {
            this.player.pause();
            this.player.unload();
            this.player.detachMediaElement();
            this.player.destroy();
        } catch (error) {
            console.warn('[FlvPlayer] destroy error:', error);
        }

        this.player = null;
    }

    /**
     * 完全销毁播放器并清理资源
     */
    destroy(): void {
        this.destroyed = true;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.destroyPlayer();

        if (this.video) {
            this.video.pause();
            this.video.removeAttribute('src');
            this.video.load();
        }

        this.video = null;
        this.url = '';
        this.events = {};
        this.reconnectAttempts = 0;
    }
}
