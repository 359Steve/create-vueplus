# FlvPlayer 使用与流程说明

> 文件：`src/service/flv/FlvManger.ts`
>
> 这个类是对 `flv.js` 的一层业务封装，负责把 FLV 地址挂载到原生 `<video>` 元素上，并统一处理播放器生命周期、事件转发和错误重连。

## 1. 整体职责

`FlvPlayer` 只负责视频播放链路本身：

- 合并默认配置和调用方配置。
- 设置 `<video>` 的播放属性。
- 创建、挂载和销毁 `flv.js` Player。
- 将 `flv.js` 和原生 `video` 事件转换为业务回调。
- 播放器发生错误后，按间隔自动重建实例。
- 切换播放地址时，销毁旧实例并创建新实例。

它不负责：

- 获取 FLV 地址。
- 创建或管理 `<video>` 元素。
- 展示 loading、错误提示或重连提示。
- 维护页面级的连接状态。
- 处理 WebRTC。`WebRtcManager` 是另一条视频链路。

## 2. 调用入口

当前主要调用方是 `src/components/monitor/FlvVideo.vue`：

```ts
let player: FlvPlayer | null = null;

onMounted(() => {
    player = new FlvPlayer({ isLive: true, autoplay: true, muted: true });
    player.init(video, url, {
        error: () => emit('error', props.deviceId),
        playing: () => emit('playing', props.deviceId),
    });
});

onBeforeUnmount(() => {
    player?.destroy();
    player = null;
});
```

调用关系可以理解为：

```text
FlvVideo.vue
    |
    | 组件挂载
    v
new FlvPlayer(options)
    |
    | init(videoElement, flvUrl, events)
    v
FlvPlayer.createPlayer()
    |
    +--> flvjs.isSupported()
    +--> flvjs.createPlayer(mediaDataSource, config)
    +--> bindPlayerEvents()
    +--> attachMediaElement(video)
    +--> load()
    |
    +--> 播放成功: video.playing -> events.playing
    +--> 播放异常: flvjs.ERROR -> reconnect()
    |
    | 组件卸载
    v
FlvPlayer.destroy()
    |
    +--> 清理重连定时器
    +--> pause / unload / detach / destroy
    +--> 清空 video、url、events 和计数器
```

## 3. 初始化流程

### 3.1 构造函数：保存配置

```ts
const player = new FlvPlayer({
    isLive: true,
    autoplay: true,
    muted: true,
    maxReconnectAttempts: 5,
    reconnectInterval: 3000,
});
```

构造函数不会创建 `flv.js` 实例，只会把调用方配置与 `DEFAULT_OPTIONS` 合并。

默认值如下：

| 配置 | 默认值 | 作用 |
| --- | --- | --- |
| `isLive` | `true` | 按直播流处理 |
| `autoplay` | `true` | 设置视频自动播放 |
| `loop` | `false` | 设置视频是否循环 |
| `muted` | `true` | 静音，降低浏览器自动播放被拦截的概率 |
| `maxReconnectAttempts` | `5` | 最大重连次数 |
| `reconnectInterval` | `3000` | 重连间隔，单位毫秒 |
| `rangeLoadZeroStart` | 未设置 | 可传给调用方或底层配置使用 |
| `fixAudioTimestampGap` | 未设置 | 可传给调用方或底层配置使用 |
| `config` | 未设置 | 原样传给 `flvjs.createPlayer` 的底层配置 |

注意：`rangeLoadZeroStart` 和 `fixAudioTimestampGap` 虽然定义在 `FlvPlayerOptions` 中，但当前 `createPlayer()` 没有把它们拼到 `MediaDataSource` 中。如果要让它们真正生效，需要按 `flv.js` 当前版本的配置结构补充映射。

### 3.2 `init()`：接收视频元素和地址

调用：

```ts
player.init(videoElement, flvUrl, events);
```

`init()` 做四件事：

1. 保存 `video`、`url` 和业务事件回调。
2. 将 `autoplay`、`loop`、`muted`、`playsInline` 等属性写入 `<video>`。
3. 将 `destroyed` 重置为 `false`，允许本次实例工作。
4. 调用 `createPlayer()` 创建真正的 `flv.js` 播放器。

`init()` 返回 `boolean`：

- `true`：播放器实例创建并开始 `load()`。
- `false`：没有有效视频或地址，或者当前浏览器不支持 `flv.js`。

## 4. `createPlayer()` 的详细时序

```text
createPlayer()
    |
    +-- video 或 url 不存在？-- 是 --> return false
    |
    +-- flvjs.isSupported()？-- 否 --> error 回调，return false
    |
    +-- destroyPlayer()
    |       清理可能存在的旧 flv.js 实例
    |
    +-- 组装 MediaDataSource
    |       type: 'flv'
    |       url: 当前 url
    |       isLive: 当前 isLive
    |
    +-- flvjs.createPlayer(mediaDataSource, config)
    |
    +-- bindPlayerEvents()
    |
    +-- player.attachMediaElement(video)
    |
    +-- player.load()
    |
    +-- return true
```

这里的 `destroyPlayer()` 很关键：初始化、重连和切换地址都可能重复调用 `createPlayer()`，先清理旧实例可以避免多个 `flv.js` 实例同时占用同一个 `<video>`。

## 5. 事件模型

封装里同时监听两类事件。

### 5.1 `flv.js` 播放器事件

| 底层事件 | 当前处理 |
| --- | --- |
| `flvjs.Events.ERROR` | 打印错误并进入 `reconnect()` |
| `flvjs.Events.LOADING_COMPLETE` | 转发为业务层 `ended()` |
| `flvjs.Events.MEDIA_INFO` | 转发为业务层 `loaded()` |

`ERROR` 不会立即把底层错误直接传给 `events.error`，而是先尝试重连。只有播放器已销毁或达到最大重连次数时，才会调用 `events.error`。

### 5.2 原生 `<video>` 事件

| 原生事件 | 业务回调或副作用 |
| --- | --- |
| `play` | 转发为 `play()` |
| `pause` | 转发为 `pause()` |
| `playing` | 重置重连次数，并转发为 `playing()` |
| `waiting` | 转发为 `waiting()` |
| `loadstart` | 转发为 `loading()` |

事件名称容易混淆：`play` 表示开始执行播放动作，`playing` 表示已经有媒体内容可以正常播放。监控页面通常更适合使用 `playing` 判断视频是否真正恢复。

## 6. 播放、暂停和切换地址

### 播放

```ts
await player.play();
```

封装调用 `video.play()`。因为浏览器可能阻止自动播放，方法内部捕获异常并调用 `events.error`。

### 暂停

```ts
player.pause();
```

如果当前没有视频元素，使用可选链直接结束，不会抛异常。

### 切换地址

```ts
player.switchUrl(nextUrl);
```

流程如下：

```text
nextUrl 与当前 url 相同？-- 是 --> 不做任何操作
        |
        否
        v
更新 url
重置 reconnectAttempts
调用 createPlayer()
    |
    +--> destroyPlayer() 清理旧实例
    +--> 使用新 url 创建实例
    +--> 重新绑定事件并 load()
```

`switchUrl()` 不会修改 `<video>` 元素，也不会创建新的 `FlvPlayer` 对象。

## 7. 错误与重连流程

重连由 `flvjs.Events.ERROR` 触发，采用“单定时器 + 次数上限”的策略：

```text
收到 flv.js ERROR
        |
        +-- 已 destroy？或 attempts >= max？
        |       |
        |       +-- 是：调用 events.error，结束
        |
        +-- 已有 reconnectTimer？
        |       |
        |       +-- 是：直接返回，避免重复排队
        |
        +-- attempts++
        +-- setTimeout(reconnectInterval)
                |
                +-- 定时器触发
                        |
                        +-- 已 destroy？-- 是 --> 结束
                        |
                        +-- createPlayer()
                                destroy 旧实例
                                创建新实例
                                重新 load
```

重要细节：

- 第一次错误不会马上重建，而是等待 `reconnectInterval`。
- 同一时间只允许一个重连定时器存在。
- `playing` 事件到达后会把 `reconnectAttempts` 清零，表示播放已经恢复。
- 默认最多重连 5 次；达到上限后才通知业务层错误。
- `destroy()` 会清除定时器，因此卸载组件后不会再次创建播放器。
- 重连次数是当前 `FlvPlayer` 实例级别的计数；调用 `switchUrl()` 会手动重置它。

## 8. 销毁流程

### `destroyPlayer()`

这是内部的“只销毁 `flv.js` 实例”方法，依次执行：

```text
player.pause()
player.unload()
player.detachMediaElement()
player.destroy()
player = null
```

它用于重新创建播放器，不会清空 `video`、`url` 和业务事件。

### `destroy()`

这是对外的完整销毁方法，通常在 Vue 的 `onBeforeUnmount()` 中调用：

```text
destroy()
    |
    +-- destroyed = true
    +-- 清除 reconnectTimer
    +-- destroyPlayer()
    +-- video.pause()
    +-- 移除 video 的 src
    +-- video.load()，清理浏览器媒体状态
    +-- 清空 video、url、events
    +-- reconnectAttempts = 0
```

`destroyed` 标记不仅表示当前实例已结束，也用于阻止延迟重连回调在组件卸载后继续工作。

## 9. 推荐使用方式

### Vue 组件中的最小用法

```ts
const videoRef = useTemplateRef<HTMLVideoElement>('videoRef');
let player: FlvPlayer | null = null;

onMounted(() => {
    const video = videoRef.value;
    if (!video || !props.url) return;

    player = new FlvPlayer({
        isLive: true,
        autoplay: true,
        muted: true,
    });

    player.init(video, props.url, {
        loading: () => {
            // 设置页面 loading 状态
        },
        playing: () => {
            // 视频真正开始播放
        },
        error: (error) => {
            // 展示错误状态或通知上层
        },
    });
});

onBeforeUnmount(() => {
    player?.destroy();
    player = null;
});
```

### 地址变化时

如果组件仍然复用同一个视频元素，可以调用：

```ts
watch(
    () => props.url,
    (url) => {
        if (url) player?.switchUrl(url);
    },
);
```

如果视频元素或组件本身也发生变化，应先销毁旧实例，再重新 `new FlvPlayer()` 并调用 `init()`。

## 10. 新人排查问题的顺序

1. 检查传入的 `video` 是否已经挂载，`url` 是否为空。
2. 检查 `flvjs.isSupported()` 是否返回 `true`。
3. 检查 `createPlayer()` 是否成功执行到 `attachMediaElement()` 和 `load()`。
4. 查看控制台中的 `[FlvPlayer] error`，确认错误类型和错误详情。
5. 确认是否触发了 `playing`。只有这个事件触发后，重连次数才会归零。
6. 检查是否因为浏览器自动播放策略导致 `video.play()` 被拒绝。直播场景通常需要保持 `muted: true`。
7. 检查组件卸载时是否调用了 `destroy()`，以及地址切换时是否复用了同一个播放器实例。

## 11. 当前实现的边界

- `init()` 没有主动调用 `play()`，自动播放依赖 `<video autoplay>` 和 `flv.js` 加载后的浏览器行为；需要强制尝试播放时调用 `player.play()`。
- `ended()` 当前映射自 `LOADING_COMPLETE`，它表达的是 `flv.js` 加载完成，不一定等同于普通点播视频的 `video.ended`。
- `bindPlayerEvents()` 每次创建播放器时都会给同一个 `<video>` 添加事件监听器。由于 `destroyPlayer()` 只销毁 `flv.js` 实例，没有移除这些原生监听器，反复重连或切换地址可能产生重复回调。若后续发现同一业务事件触发多次，应优先补充原生事件监听器的解绑机制。
- `rangeLoadZeroStart` 和 `fixAudioTimestampGap` 当前只是类型字段，尚未映射到 `flv.js` 创建参数。
- 重连只针对 `flv.js` 的 `ERROR` 事件；单纯长时间 `waiting` 不会触发重连。
