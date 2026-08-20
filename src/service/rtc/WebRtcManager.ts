import { communalFunction } from '@/utils/communal';

/** Rtc 状态 */
type WebRtcConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

/** 事件组 */
export interface WebRtcEventMap {
    track: MediaStream;
    connectionStateChange: WebRtcConnectionState;
    iceConnectionStateChange: RTCIceConnectionState;
    iceGatheringStateChange: RTCIceGatheringState;
    error: Error;
    play: void;
    stop: void;
}

/** 事件类型 */
type WebRtcEventHandler<T> = (_data: T) => void;

/** 实例化参数类型 */
interface WeBRtcOptions {
    url: string;

    video: HTMLVideoElement;

    /**
     * 是否接收视频
     */
    videoEnabled?: boolean;

    /**
     * 是否接收音频
     */
    audioEnabled?: boolean;

    /**
     * ICE Server
     */
    iceServers?: RTCIceServer[];

    /**
     * ICE gathering 超时时间
     */
    iceGatheringTimeout?: number;
}

export class WeBRtc {
    /** 连接地址 */
    private readonly _url: string;
    /** 播放容器 */
    private readonly _video: HTMLVideoElement;
    /** 是否接收视频 */
    private readonly _videoEnabled: boolean;
    /** 是否接收音频 */
    private readonly _audioEnabled: boolean;
    /** ICE Server */
    private readonly _iceGatheringTimeout: number;
    /** ICE gathering 超时时间 */
    private readonly _iceServers: RTCIceServer[];
    /** Rtc 实例对象 */
    private _peer: RTCPeerConnection | null = null;
    /** 标记是否在播放 */
    private _playing = false;
    /** 创建事件组 */
    private _events = new Map<keyof WebRtcEventMap, Set<WebRtcEventHandler<any>>>();

    constructor(options: WeBRtcOptions) {
        this._url = options.url;

        this._video = options.video;

        this._videoEnabled = options.videoEnabled ?? true;

        this._audioEnabled = options.audioEnabled ?? true;

        this._iceGatheringTimeout = options.iceGatheringTimeout ?? 10_000;

        this._iceServers = options.iceServers ?? [];
    }

    /**
     * 初始化
     */
    initCreateRtc() {
        this.destroyPeer();

        // 创建 RTC 实例
        this._peer = new RTCPeerConnection({
            iceServers: this._iceServers,
        });

        /** 绑定事件 */
        this.bindPeerEvents(this._peer);

        return this._peer;
    }

    /**
     * 开始播放
     */
    async onPlay() {
        if (this._playing) {
            return;
        }

        try {
            const peer = this._peer ?? this.initCreateRtc();

            this._playing = true;

            // 添加接收
            this.addTransceivers(peer);

            // 创建通信方案
            const offer = await peer.createOffer();

            // 将方案设置到本地
            await peer.setLocalDescription(offer);

            // 等待 ICE Gathering
            await this.waitForIceGatheringComplete(peer);

            // 获取本地设置的方案数据
            const localDescription = peer.localDescription;

            if (!localDescription) {
                throw new Error('WebRTC localDescription 不存在');
            }

            const answer = await this.requestAnswer(localDescription.sdp);

            // 设置远端 SDP
            await peer.setRemoteDescription({
                type: 'answer',
                sdp: answer,
            });

            this.emit('play', undefined);
        } catch (error) {
            this._playing = false;

            const err = error instanceof Error ? error : new Error(String(error));

            this.emit('error', err);

            this.stop();

            throw err;
        }
    }

    /**
     * 添加接收媒体
     */
    private addTransceivers(peer: RTCPeerConnection) {
        if (this._videoEnabled) {
            // 添加接收视频
            peer.addTransceiver('video', {
                direction: 'recvonly',
            });
        }

        if (this._audioEnabled) {
            // 添加接收音频
            peer.addTransceiver('audio', {
                direction: 'recvonly',
            });
        }
    }

    /**
     * 请求并获取视频数据
     */
    private async requestAnswer(sdp: string) {
        const response = await request.post<string, string>(this._url, sdp, {
            baseURL: communalFunction.env.getEnv('VITE_API_RTC_URL'),

            headers: {
                'Content-Type': 'application/sdp',
            },
        });

        if (!response) {
            throw new Error('数据数据为空');
        }

        return response;
    }

    /**
     * 绑定事件
     */
    private bindPeerEvents(peer: RTCPeerConnection) {
        // 接收远端媒体
        peer.ontrack = (event) => {
            const stream = event.streams[0];

            if (!stream) {
                return;
            }

            this._video.srcObject = stream;

            this.emit('track', stream);

            // 尝试播放
            void this.playVideo();
        };

        peer.onconnectionstatechange = () => {
            this.emit('connectionStateChange', peer.connectionState);

            if (peer.connectionState === 'failed') {
                this.emit('error', new Error('WebRTC connection failed'));
            }
        };

        peer.oniceconnectionstatechange = () => {
            this.emit('iceConnectionStateChange', peer.iceConnectionState);
        };

        peer.onicegatheringstatechange = () => {
            this.emit('iceGatheringStateChange', peer.iceGatheringState);
        };
    }

    /**
     * 播放 video
     */
    private async playVideo() {
        try {
            await this._video.play();
        } catch (error) {
            console.warn('video.play() 失败:', error);
        }
    }

    /** 清除定时器并取消监听 */
    private cleanup(timer: ReturnType<typeof setTimeout>, handleStateChange: () => void) {
        clearTimeout(timer);

        this._peer?.removeEventListener('icegatheringstatechange', handleStateChange);
    }

    /**
     * 等待 ICE 收集完成
     */
    private waitForIceGatheringComplete(peer: RTCPeerConnection) {
        if (peer.iceGatheringState === 'complete') {
            return Promise.resolve();
        }

        return new Promise<void>((resolve, reject) => {
            let timer: ReturnType<typeof setTimeout>;

            const handleStateChange = () => {
                if (peer.iceGatheringState === 'complete') {
                    this.cleanup(timer, handleStateChange);

                    resolve();
                }
            };

            // 超时就返回错误
            timer = setTimeout(() => {
                this.cleanup(timer, handleStateChange);

                reject(new Error('ICE gathering timeout'));
            }, this._iceGatheringTimeout);

            // 监听 ICE 状态
            peer.addEventListener('icegatheringstatechange', handleStateChange);
        });
    }

    /**
     * 订阅事件
     */
    on<K extends keyof WebRtcEventMap>(event: K, handler: WebRtcEventHandler<WebRtcEventMap[K]>) {
        let handlers = this._events.get(event);

        if (!handlers) {
            handlers = new Set();

            this._events.set(event, handlers);
        }

        handlers.add(handler);

        return () => {
            handlers?.delete(handler);
        };
    }

    /**
     * 触发事件
     */
    private emit<K extends keyof WebRtcEventMap>(event: K, data: WebRtcEventMap[K]) {
        this._events.get(event)?.forEach((handler) => {
            handler(data);
        });
    }

    /**
     * 停止播放
     */
    stop() {
        this._playing = false;

        this._video.pause();

        this._video.srcObject = null;

        this.destroyPeer();

        this.emit('stop', undefined);
    }

    /**
     * 销毁
     */
    private destroyPeer() {
        if (!this._peer) {
            return;
        }

        this._peer.ontrack = null;

        this._peer.onconnectionstatechange = null;

        this._peer.oniceconnectionstatechange = null;

        this._peer.onicegatheringstatechange = null;

        this._peer.close();

        this._peer = null;
    }

    /**
     * 销毁实例
     */
    destroy() {
        this.stop();

        this._events.clear();
    }
}
