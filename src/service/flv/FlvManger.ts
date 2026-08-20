import type FlvJs from 'flv.js';
import flvjs from 'flv.js';

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

export interface FlvPlayerEvents {
    play?: () => void;
    pause?: () => void;
    ended?: () => void;
    loaded?: () => void;
    error?: (_error: unknown) => void;
    loading?: () => void;
    playing?: () => void;
    waiting?: () => void;
}

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

export class FlvPlayer {
    private player: FlvJs.Player | null = null;
    private video: HTMLVideoElement | null = null;
    private url = '';
    private options: FlvPlayerOptions;
    private events: FlvPlayerEvents = {};
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private reconnectAttempts = 0;
    private destroyed = false;

    constructor(options: FlvPlayerOptions = {}) {
        this.options = {
            ...DEFAULT_OPTIONS,
            ...options,
        };
    }

    /**
     * 初始化播放器
     */
    init(video: HTMLVideoElement, url: string, events: FlvPlayerEvents = {}) {
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
     * 创建实例
     */
    private createPlayer() {
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
    private bindPlayerEvents() {
        if (!this.player) {
            return;
        }

        this.player.on(flvjs.Events.ERROR, (errorType, errorDetail, errorInfo) => {
            console.error('[FlvPlayer] error:', errorType, errorDetail, errorInfo);

            this.events.error?.({
                errorType,
                errorDetail,
                errorInfo,
            });

            this.reconnect();
        });

        this.player.on(flvjs.Events.LOADING_COMPLETE, () => {
            this.events.ended?.();
        });

        this.player.on(flvjs.Events.MEDIA_INFO, () => {
            this.events.loaded?.();
        });

        this.video?.addEventListener('play', () => {
            this.events.play?.();
        });

        this.video?.addEventListener('pause', () => {
            this.events.pause?.();
        });

        this.video?.addEventListener('playing', () => {
            this.events.playing?.();
        });

        this.video?.addEventListener('waiting', () => {
            this.events.waiting?.();
        });

        this.video?.addEventListener('loadstart', () => {
            this.events.loading?.();
        });
    }

    // 播放
    async play() {
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
    pause() {
        this.video?.pause();
    }

    /**
     * 切换播放地址
     */
    switchUrl(url: string) {
        if (this.url === url) {
            return;
        }

        this.url = url;
        this.reconnectAttempts = 0;

        this.createPlayer();
    }

    /**
     * 重连
     */
    private reconnect() {
        if (this.destroyed || this.reconnectAttempts >= (this.options.maxReconnectAttempts ?? 5)) {
            console.error('[FlvPlayer] 达到最大重连次数');
            return;
        }

        if (this.reconnectTimer) {
            return;
        }

        this.reconnectAttempts++;

        console.warn(`[FlvPlayer] ${this.options.reconnectInterval}ms 后重连，第 ${this.reconnectAttempts} 次`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;

            if (this.destroyed) {
                return;
            }

            this.createPlayer();
        }, this.options.reconnectInterval);
    }

    /**
     * 销毁
     */
    private destroyPlayer() {
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
     * 完全销毁
     */
    destroy() {
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
