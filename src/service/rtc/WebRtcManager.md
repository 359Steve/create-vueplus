# WeBRtc 使用与流程说明

> 文件：`src/service/rtc/WebRtcManager.ts`
>
> `WeBRtc` 是对浏览器原生 WebRTC 播放流程的封装，当前按 WHEP 模式从服务端拉取实时音视频。它负责创建 `RTCPeerConnection`、完成 SDP Offer/Answer 协商、等待 ICE Candidate 收集、接收远端媒体并绑定到 `<video>`。

## 1. 整体职责

`WeBRtc` 负责：

- 创建和销毁 `RTCPeerConnection`。
- 根据配置声明接收视频和音频。
- 创建本地 SDP Offer，并设置为本地描述。
- 等待 ICE Gathering 完成，确保 Offer 中包含 Candidate。
- 将 Offer SDP 通过 HTTP POST 发送到 WHEP 地址。
- 接收服务端返回的 Answer SDP，并设置为远端描述。
- 接收远端 `MediaStream`，绑定到视频元素并尝试播放。
- 对连接状态、ICE 状态、媒体轨道和播放错误进行事件通知。

它不负责：

- 生成 WHEP 地址或获取当前设备 ID。
- 管理页面 loading、错误文案和提示组件。
- 自动重连。当前实现只会上报连接失败，不会自动重新协商。
- 截图和录像。截图、`MediaRecorder` 录制由 `src/store/cockpit.ts` 负责。

## 2. 当前业务调用链

当前主要使用位置是 `src/pages/home/CockpitView.vue`，调用链如下：

```text
CockpitView.vue
    |
    | onMounted()
    +--> 获取 video 元素
    +--> 读取 VITE_LIVE_RTC_URL
    +--> 拼接 ?app=live&stream={currentId}.flv
    +--> new WeBRtc({ url, video })
    +--> 注册 error / track 事件
    +--> peer.initCreateRtc()
    |
    +--> useVideoRtc().activePlay()
            |
            +--> peer.value.onPlay()
                    |
                    +--> SDP / ICE / WHEP 协商
                    +--> ontrack
                    +--> video.srcObject = MediaStream
                    +--> video.play()

CockpitView.vue onBeforeUnmount()
    |
    +--> cockpit.rest()
            |
            +--> peer.destroy()
                    |
                    +--> stop()
                    +--> close RTCPeerConnection
                    +--> 清理事件订阅
```

`FlvVideo.vue` 使用的是另一套 FLV 播放封装，不经过 `WeBRtc`。虽然 WHEP URL 中的流名称包含 `.flv`，但传输层仍然是 WebRTC，不是 `flv.js`。

## 3. 实例创建和配置

```ts
const peer = new WeBRtc({
    url: 'https://example.com/rtc/v1/whep/?app=live&stream=camera.flv',
    video,
    videoEnabled: true,
    audioEnabled: true,
    iceServers: [],
    iceGatheringTimeout: 10_000,
});
```

配置说明：

| 配置 | 默认值 | 作用 |
| --- | --- | --- |
| `url` | 必填 | WHEP 服务端地址，接收 Offer SDP 并返回 Answer SDP |
| `video` | 必填 | 承载远端媒体的原生 `<video>` 元素 |
| `videoEnabled` | `true` | 是否声明接收视频 |
| `audioEnabled` | `true` | 是否声明接收音频 |
| `iceServers` | `[]` | `RTCPeerConnection` 使用的 STUN/TURN 服务 |
| `iceGatheringTimeout` | `10000` | ICE Candidate 收集超时时间，单位毫秒 |

构造函数只保存配置，不会发起网络请求，也不会自动创建 PeerConnection。真正创建连接需要调用 `initCreateRtc()` 或 `onPlay()`。

## 4. 初始化流程：`initCreateRtc()`

```text
initCreateRtc()
    |
    +--> destroyPeer()
    |       如果存在旧连接，先解绑事件并关闭
    |
    +--> new RTCPeerConnection({ iceServers })
    |
    +--> bindPeerEvents(peer)
    |
    +--> 保存到 _peer
    |
    +--> 返回 RTCPeerConnection
```

这个方法只完成浏览器连接对象的初始化，不会：

- 添加视频或音频接收器。
- 创建 SDP Offer。
- 请求 WHEP 服务端。
- 开始播放。

因此单独调用 `initCreateRtc()` 后，视频不会自动出现，还需要调用 `onPlay()`。

## 5. 播放流程：`onPlay()`

`onPlay()` 是完整播放流程的入口。

```text
onPlay()
    |
    +-- _playing 已经为 true？-- 是 --> 直接返回
    |
    +--> 获取已有 _peer；没有则调用 initCreateRtc()
    |
    +--> _playing = true
    |
    +--> addTransceivers(peer)
    |       video: recvonly（按配置决定）
    |       audio: recvonly（按配置决定）
    |
    +--> peer.createOffer()
    |
    +--> peer.setLocalDescription(offer)
    |
    +--> waitForIceGatheringComplete(peer)
    |       等待 iceGatheringState = complete
    |
    +--> 读取 peer.localDescription.sdp
    |
    +--> POST _url
    |       Content-Type: application/sdp
    |       请求体：本地 Offer SDP
    |
    +--> 获取服务端 Answer SDP
    |
    +--> peer.setRemoteDescription({ type: 'answer', sdp: answer })
    |
    +--> emit('play')
    |
    +--> 后续等待 peer.ontrack 接收远端媒体
```

### 5.1 添加接收方向

`addTransceivers()` 使用 `recvonly`：

```ts
peer.addTransceiver('video', { direction: 'recvonly' });
peer.addTransceiver('audio', { direction: 'recvonly' });
```

这表示浏览器只接收服务端媒体，不向服务端发送摄像头或麦克风媒体。关闭某一项配置后，对应的 transceiver 不会被加入 Offer。

### 5.2 SDP Offer/Answer

SDP 是 WebRTC 协商媒体能力、编码格式和连接信息的描述文本：

1. 浏览器创建 Offer，声明希望接收的视频和音频能力。
2. `setLocalDescription()` 保存本地描述并开始 ICE Candidate 收集。
3. `requestAnswer()` 将完整 Offer SDP POST 到 WHEP 地址。
4. 服务端返回 Answer SDP。
5. `setRemoteDescription()` 保存服务端 Answer，双方开始建立 WebRTC 媒体连接。

请求必须使用：

```text
POST {WHEP_URL}
Content-Type: application/sdp

{Offer SDP}
```

当前 `requestAnswer()` 通过项目里的 `request.post` 发起请求，因此实际的鉴权、基础 URL、错误转换等行为还要结合 `src/utils/request.ts` 查看。

## 6. ICE Gathering 流程

ICE 用于收集浏览器可用的网络候选地址 Candidate。当前实现采用“等待收集完成后再发送 Offer”的方式：

```text
setLocalDescription(offer)
        |
        v
iceGatheringState = gathering
        |
        +--> 持续收集 Candidate
        |
        +--> icegatheringstatechange
                |
                +--> state = complete
                        |
                        +--> 继续发送 localDescription.sdp
```

`waitForIceGatheringComplete(peer)` 有两个结束条件：

- 状态已经是 `complete`：立即成功返回。
- 在 `iceGatheringTimeout` 内没有完成：抛出 `ICE gathering timeout`。

完成或超时后都会清除定时器并移除临时状态监听器，避免监听器和定时器泄漏。

如果部署环境存在 NAT、防火墙或跨网通信问题，需要配置合适的 STUN/TURN：

```ts
new WeBRtc({
    url,
    video,
    iceServers: [
        { urls: 'stun:stun.example.com:3478' },
        {
            urls: 'turn:turn.example.com:3478',
            username: 'user',
            credential: 'password',
        },
    ],
});
```

## 7. 远端媒体与视频播放

服务端 Answer 设置成功后，连接建立过程中会触发 `peer.ontrack`：

```text
peer.ontrack(event)
    |
    +--> 读取 event.streams[0]
    |
    +--> 没有 stream？结束
    |
    +--> video.srcObject = stream
    |
    +--> emit('track', stream)
    |
    +--> video.play()
```

`track` 事件表示已经收到远端媒体流，并不只表示连接对象创建成功。业务层通常可以用它关闭 loading 状态。

当前播放调用是 `playVideo()`，它会捕获浏览器播放失败并打印警告，但不会向外触发 `error`。常见原因是浏览器自动播放策略、页面未获得用户手势或视频元素配置不符合浏览器要求。

## 8. 事件模型

通过 `on()` 注册事件：

```ts
const unsubscribe = peer.on('track', (stream) => {
    console.log('收到远端媒体', stream);
});

unsubscribe();
```

同一个事件支持多个监听器，内部使用 `Set` 保存，因此同一个函数不会重复添加。

| 事件 | 数据 | 触发时机 |
| --- | --- | --- |
| `track` | `MediaStream` | 收到远端媒体流并准备绑定到 `<video>` 后 |
| `connectionStateChange` | `RTCPeerConnectionState` | PeerConnection 连接状态变化 |
| `iceConnectionStateChange` | `RTCIceConnectionState` | ICE 连接状态变化 |
| `iceGatheringStateChange` | `RTCIceGatheringState` | ICE Candidate 收集状态变化 |
| `error` | `Error` | 播放流程异常或连接状态变为 `failed` |
| `play` | 无 | Answer 设置成功，协商流程完成 |
| `stop` | 无 | 调用 `stop()` 或 `destroy()` |

事件语义需要注意：

- `play` 是 SDP 协商完成事件，不等同于原生 `video` 的 `playing`。
- `track` 是收到媒体流事件，不等同于画面已经完成渲染。
- `connectionStateChange = connected` 更适合判断 PeerConnection 已建立。
- `connectionStateChange = failed` 会触发一次 `error`，但当前不会自动重连。

## 9. 异常流程

`onPlay()` 中的任意一步失败，都会进入统一异常处理：

```text
createOffer / setLocalDescription / ICE 等步骤失败
        |
        +--> _playing = false
        +--> 转换成 Error
        +--> emit('error', err)
        +--> stop()
        +--> 抛出 err
```

因此调用方可以选择两种处理方式：

- 订阅 `error`，更新界面错误状态。
- `await onPlay()` 并使用 `try/catch` 处理失败。

当前项目中的 `activePlay()` 已经捕获 `onPlay()` 抛出的错误，并通过 `ElMessage.error` 显示提示；页面同时通过 `peer.on('error')` 设置 `isError`。

`connectionState = failed` 的处理不同：事件监听器会发出 `error`，但不会自动调用 `stop()`，也不会重试。需要业务层决定是否重新创建 `WeBRtc` 或再次调用播放流程。

## 10. 停止与销毁

### `stop()`

`stop()` 用于停止当前播放并关闭底层 PeerConnection：

```text
stop()
    |
    +--> _playing = false
    +--> video.pause()
    +--> video.srcObject = null
    +--> destroyPeer()
    +--> emit('stop')
```

调用 `stop()` 后，事件订阅仍然保留，实例理论上可以再次调用 `onPlay()` 播放。

### `destroyPeer()`

这是内部连接清理方法：

1. 将 `ontrack`、连接状态和 ICE 状态处理器设为 `null`。
2. 调用 `peer.close()` 关闭连接。
3. 将 `_peer` 设为 `null`。

### `destroy()`

这是实例级的完整销毁方法，通常在组件卸载时调用：

```text
destroy()
    |
    +--> stop()
    +--> 清空所有事件订阅
```

在 `CockpitView.vue` 中，`useVideoRtc.rest()` 会先停止录制，再调用 `peer.destroy()`，最后清空 store 中保存的 Peer 实例。

## 11. 推荐 Vue 使用方式

```ts
const videoRef = useTemplateRef<HTMLVideoElement>('videoRef');
let peer: WeBRtc | null = null;

onMounted(async () => {
    const video = videoRef.value;
    if (!video || !streamUrl) return;

    peer = new WeBRtc({
        url: streamUrl,
        video,
        videoEnabled: true,
        audioEnabled: true,
    });

    const stopListening = peer.on('track', () => {
        // 关闭 loading 状态
    });
    peer.on('error', () => {
        // 展示视频错误状态
    });

    try {
        peer.initCreateRtc();
        await peer.onPlay();
    } catch {
        // onPlay 已经触发 error；这里可以补充页面级处理
    }

    onBeforeUnmount(() => {
        stopListening();
        peer?.destroy();
        peer = null;
    });
});
```

实际项目中应把 `onBeforeUnmount()` 放在组件 setup 的同步执行阶段注册，而不是依赖异步回调内部注册。当前 `CockpitView.vue` 使用 store 的 `rest()` 统一清理连接和录制状态。

## 12. 截图和录像的前置条件

WebRTC 播放成功后，`video.srcObject` 才会有远端 `MediaStream`：

- 截图需要 `video.videoWidth` 和 `video.videoHeight` 有效。
- 录像需要浏览器支持 `captureStream()` 和 `MediaRecorder`。
- `useVideoRtc.toggleRecord()` 会从当前 video 的 `captureStream()` 创建录制器。
- `WeBRtc` 本身不保存录制数据，也不负责生成下载文件。

## 13. 新人排查问题的顺序

1. 检查 `videoRef` 是否已经拿到真实的 `<video>` 元素。
2. 检查 WHEP URL 是否正确，尤其是 `app`、`stream` 和鉴权参数。
3. 检查 `initCreateRtc()` 是否成功创建 `RTCPeerConnection`。
4. 检查 `onPlay()` 是否执行到 `createOffer()`、`setLocalDescription()` 和 ICE 等待。
5. 查看 WHEP POST 的 HTTP 状态码和响应体是否为有效 Answer SDP。
6. 查看 `iceGatheringState`、`iceConnectionState` 和 `connectionState` 的变化。
7. 确认是否触发 `track`，以及 `video.srcObject` 是否被赋值。
8. 确认浏览器是否拒绝 `video.play()`，并检查页面是否需要用户手势。
9. 检查流服务端是否真的存在对应的 `.flv` 流，以及服务端是否允许当前浏览器网络访问。
10. 组件卸载时确认调用了 `destroy()`，避免连接继续占用资源。

## 14. 当前实现的边界

- 类名 `WeBRtc` 使用了非典型大小写；新增调用代码应沿用现有导出名称，避免无意中改动公共 API。
- `initCreateRtc()` 是同步方法，`onPlay()` 会复用已有连接；重复调用 `onPlay()` 时，`_playing` 为 `true` 会直接返回。
- `onPlay()` 失败后会执行 `stop()`，所以 `_peer` 会被关闭并清空；重试时会创建新的 PeerConnection。
- 连接进入 `failed` 时只触发 `error`，没有内置重连、重新 POST SDP 或刷新流地址逻辑。
- 当前 `ontrack` 只使用 `event.streams[0]`；如果浏览器或服务端没有把流放在该数组中，事件会被忽略。
- `playVideo()` 的播放失败只打印警告，不会触发 `error` 事件，页面可能仍显示为已收到 track。
- `stop()` 会清空 `video.srcObject` 并关闭连接，但不会清空事件订阅；只有 `destroy()` 会清空事件。
- `requestAnswer()` 只检查响应内容是否为空，Answer SDP 的格式和 HTTP 状态处理依赖项目请求封装及服务端行为。
