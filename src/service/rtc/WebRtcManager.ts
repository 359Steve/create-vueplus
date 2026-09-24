/** WebRTC 连接状态 */
type WebRtcConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

/** WebRTC 事件映射 */
export interface WebRtcEventMap {
    /** 收到媒体轨道 */
    track: MediaStream;
    /** 连接状态变化 */
    connectionStateChange: WebRtcConnectionState;
    /** ICE 连接状态变化 */
    iceConnectionStateChange: RTCIceConnectionState;
    /** ICE 收集状态变化 */
    iceGatheringStateChange: RTCIceGatheringState;
    /** 错误事件 */
    error: Error;
    /** 播放开始 */
    play: void;
    /** 播放停止 */
    stop: void;
}

/** 播放被新会话取消 */
export class WebRtcPlayAbortedError extends Error {
    constructor() {
        super('WebRTC play aborted');
        this.name = 'WebRtcPlayAbortedError';
    }
}

/** 事件处理器类型 */
type WebRtcEventHandler<T> = (_data: T) => void;

/** WebRTC 实例化参数 */
interface WeBRtcOptions {
    /** 信令服务器地址 */
    url: string;
    /** 视频播放元素 */
    video: HTMLVideoElement;
    /** 是否接收视频 */
    videoEnabled?: boolean;
    /** 是否接收音频 */
    audioEnabled?: boolean;
    /** ICE 服务器配置 */
    iceServers?: RTCIceServer[];
    /** ICE gathering 超时时间（毫秒） */
    iceGatheringTimeout?: number;
}

/** WebRTC 实时视频流管理器 */
export class WeBRtc {
    /** 连接地址 */
    private _url: string;
    /** 播放容器 */
    private readonly _video: HTMLVideoElement;
    /** 是否接收视频 */
    private readonly _videoEnabled: boolean;
    /** 是否接收音频 */
    private readonly _audioEnabled: boolean;
    /** ICE gathering 超时时间（毫秒） */
    private readonly _iceGatheringTimeout: number;
    /** ICE 服务器配置 */
    private readonly _iceServers: RTCIceServer[];
    /** Rtc 实例对象 */
    private _peer: RTCPeerConnection | null = null;
    /** 标记是否在播放 */
    private _playing = false;
    /** 播放会话 ID，用于取消过期的协商 */
    private _playId = 0;
    /** 创建事件组 */
    private _events = new Map<keyof WebRtcEventMap, Set<WebRtcEventHandler<any>>>();

    /**
     * 创建 WebRTC 管理器实例
     * @param options WebRTC 配置选项
     */
    constructor(options: WeBRtcOptions) {
        this._url = options.url;

        this._video = options.video;

        this._videoEnabled = options.videoEnabled ?? true;

        this._audioEnabled = options.audioEnabled ?? true;

        this._iceGatheringTimeout = options.iceGatheringTimeout ?? 10_000;

        this._iceServers = options.iceServers ?? [];
    }

    /**
     * 初始化并创建 RTCPeerConnection 实例
     * @returns RTCPeerConnection 实例
     */
    initCreateRtc(): RTCPeerConnection {
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
     * 开始播放实时视频流
     * @throws 播放失败时抛出异常
     */
    async onPlay(): Promise<void> {
        if (this._playing) {
            return;
        }

        const playId = ++this._playId;
        const signalingUrl = this._url;

        try {
            const peer = this._peer ?? this.initCreateRtc();

            this._playing = true;

            // 添加接收
            this.addTransceivers(peer);

            // 创建通信方案
            const offer = await peer.createOffer();

            this.assertPlaySession(playId);

            // 将方案设置到本地
            await peer.setLocalDescription(offer);

            this.assertPlaySession(playId);

            // 等待 ICE Gathering
            await this.waitForIceGatheringComplete(peer, playId);

            this.assertPlaySession(playId);

            // 获取本地设置的方案数据
            const localDescription = peer.localDescription;

            if (!localDescription) {
                throw new Error('WebRTC localDescription 不存在');
            }

            const answer = await this.requestAnswer(localDescription.sdp, signalingUrl);

            this.assertPlaySession(playId);

            // 设置远端 SDP
            await peer.setRemoteDescription({
                type: 'answer',
                sdp: answer,
            });

            this.assertPlaySession(playId);

            this.emit('play', undefined);
        } catch (error) {
            if (this.isPlayAborted(error, playId)) {
                throw error instanceof WebRtcPlayAbortedError ? error : new WebRtcPlayAbortedError();
            }

            this._playing = false;

            const err = error instanceof Error ? error : new Error(String(error));

            this.emit('error', err);

            this.stop();

            throw err;
        }
    }

    /**
     * 添加媒体接收器
     * @param peer RTCPeerConnection 实例
     */
    private addTransceivers(peer: RTCPeerConnection): void {
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
     * 向信令服务器发送 SDP Offer 并获取 Answer
     * @param sdp 本地 SDP
     * @param url 信令地址
     * @returns 服务器返回的 SDP Answer
     * @throws 请求失败或返回数据为空时抛出异常
     */
    private async requestAnswer(sdp: string, url = this._url): Promise<string> {
        const response = await request.post<string, string>(url, sdp, {
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
     * 绑定 RTCPeerConnection 原生事件
     * @param peer RTCPeerConnection 实例
     */
    private bindPeerEvents(peer: RTCPeerConnection): void {
        // 接收远端媒体
        peer.ontrack = (event): void => {
            const stream = event.streams[0];

            if (!stream) {
                return;
            }

            this._video.srcObject = stream;

            this.emit('track', stream);

            // 尝试播放
            void this.playVideo();
        };

        peer.onconnectionstatechange = (): void => {
            this.emit('connectionStateChange', peer.connectionState);

            if (peer.connectionState === 'failed') {
                this.emit('error', new Error('WebRTC connection failed'));
            }
        };

        peer.oniceconnectionstatechange = (): void => {
            this.emit('iceConnectionStateChange', peer.iceConnectionState);
        };

        peer.onicegatheringstatechange = (): void => {
            this.emit('iceGatheringStateChange', peer.iceGatheringState);
        };
    }

    /**
     * 播放视频元素
     */
    private async playVideo(): Promise<void> {
        try {
            await this._video.play();
        } catch (error) {
            console.warn('video.play() 失败:', error);
        }
    }

    /**
     * 等待 ICE 候选者收集完成
     * @param peer RTCPeerConnection 实例
     * @param playId 当前播放会话 ID
     * @returns 收集完成或超时的 Promise
     */
    private waitForIceGatheringComplete(peer: RTCPeerConnection, playId: number): Promise<void> {
        if (peer.iceGatheringState === 'complete') {
            return Promise.resolve();
        }

        return new Promise<void>((resolve, reject) => {
            let settled = false;
            let timer: ReturnType<typeof setTimeout>;
            let handleStateChange: () => void;
            let handleConnectionChange: () => void;

            const finish = (callback: () => void): void => {
                if (settled) {
                    return;
                }

                settled = true;
                clearTimeout(timer);
                peer.removeEventListener('icegatheringstatechange', handleStateChange);
                peer.removeEventListener('connectionstatechange', handleConnectionChange);
                callback();
            };

            handleStateChange = (): void => {
                if (playId !== this._playId) {
                    finish(() => reject(new WebRtcPlayAbortedError()));
                    return;
                }

                if (peer.iceGatheringState === 'complete') {
                    finish(() => resolve());
                }
            };

            handleConnectionChange = (): void => {
                if (peer.connectionState !== 'closed' && peer.connectionState !== 'failed') {
                    return;
                }

                finish(() => {
                    reject(
                        playId !== this._playId
                            ? new WebRtcPlayAbortedError()
                            : new Error(`WebRTC connection ${peer.connectionState}`),
                    );
                });
            };

            timer = setTimeout(() => {
                finish(() => {
                    reject(playId !== this._playId ? new WebRtcPlayAbortedError() : new Error('ICE gathering timeout'));
                });
            }, this._iceGatheringTimeout);

            peer.addEventListener('icegatheringstatechange', handleStateChange);
            peer.addEventListener('connectionstatechange', handleConnectionChange);
        });
    }

    /**
     * 订阅 WebRTC 事件
     * @param event 事件名称
     * @param handler 事件处理器
     * @returns 取消订阅函数
     */
    on<K extends keyof WebRtcEventMap>(event: K, handler: WebRtcEventHandler<WebRtcEventMap[K]>): () => void {
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
     * 触发事件并通知所有订阅者
     * @param event 事件名称
     * @param data 事件数据
     */
    private emit<K extends keyof WebRtcEventMap>(event: K, data: WebRtcEventMap[K]): void {
        this._events.get(event)?.forEach((handler) => {
            handler(data);
        });
    }

    /**
     * 校验当前播放会话是否仍然有效
     * @param playId 发起播放时的会话 ID
     */
    private assertPlaySession(playId: number): void {
        if (playId !== this._playId) {
            throw new WebRtcPlayAbortedError();
        }
    }

    /**
     * 判断播放是否已被新会话取消
     * @param error 捕获到的错误
     * @param playId 发起播放时的会话 ID
     */
    private isPlayAborted(error: unknown, playId: number): boolean {
        return playId !== this._playId || error instanceof WebRtcPlayAbortedError;
    }

    /**
     * 切换播放地址并重新协商
     * @param url 新的播放地址
     */
    async switchUrl(url: string): Promise<void> {
        if (this._url === url) {
            if (!this._playing) {
                await this.onPlay();
            }

            return;
        }

        this.stop();
        this._url = url;
        await this.onPlay();
    }

    /**
     * 停止播放并关闭连接
     */
    stop(): void {
        this._playId++;
        this._playing = false;

        this._video.pause();

        this._video.srcObject = null;

        this.destroyPeer();

        this.emit('stop', undefined);
    }

    /**
     * 销毁 RTCPeerConnection 实例并清理资源
     */
    private destroyPeer(): void {
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
     * 销毁 WebRTC 管理器实例并清理所有资源
     */
    destroy(): void {
        this.stop();

        this._events.clear();
    }
}
