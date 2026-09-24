# 项目名称

> 基于 VuePlus 模板创建的 Vue 3 + TypeScript 项目

本项目使用 [create-vueplus](https://www.npmjs.com/package/create-vueplus) 脚手架生成，内置了完整的工程化配置和常用业务封装，开箱即用。

---

## 项目简介

该项目基于 **Vue 3 + Vite + TypeScript** 技术栈，集成了：

- **完善的工程化配置**（ESLint、Prettier、自动导入等）
- **HTTP 请求封装**（基于 Axios）
- **WebSocket 实时通信**（支持断线重连、心跳保活）
- **Leaflet 地图封装**（覆盖物管理、绘制工具、轨迹动画）
- **音视频播放**（FLV 直播、WebRTC/WHEP）
- **UI 组件库**（Element Plus、Tailwind CSS v4）

---

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | Vue 3（Composition API）、Vue Router 5、Pinia |
| 构建 | Vite 7、TypeScript |
| UI | Element Plus、Tailwind CSS v4、Sass |
| 工具库 | VueUse、Axios、jwt-decode |
| 地图 | Leaflet、leaflet-geoman、leaflet-ant-path、leaflet-trackplayer |
| 音视频 | flv.js、WebRTC（WHEP 协议） |
| 图表 | ECharts（已安装，按需引入） |
| 规范 | ESLint v9（Flat Config）、@antfu/eslint-config、Prettier |

---

## 内置能力

### 工程化配置

- **路径别名**：`@` → `src/`
- **自动导入**：`vue`、`vue-router`、`pinia`、`@vueuse/core` 等 API 无需手动 import
- **组件自动注册**：`src/components` 及 `src/*/components` 下的 Vue 组件自动按需引入
- **Element Plus 按需加载**：通过 `unplugin-vue-components` 集成
- **环境变量注入**：构建时将 `VITE_*` 变量注入到 `window.ENV`，运行时可通过 `communalFunction.env.getEnv()` 读取

### HTTP 请求（`src/utils/request.ts`）

- 基于 Axios 封装，支持 `get` / `post` / `put` / `patch` / `delete`
- 统一解析后端 `{ code, data, message }` 响应结构
- 自动携带 Bearer Token（localStorage `gcs-token`）
- 401 时清除 Token 并跳转登录页
- 提供 `RequestError` 统一错误类型

### 鉴权工具（`src/utils/jwt.ts`）

- JWT Token 过期校验（`jwt-decode`）

### WebSocket（`src/service/socket/`）

- `WebSocketManager`：连接生命周期管理
- 指数退避 + 抖动重连策略
- 心跳保活
- 断线消息队列
- 事件总线订阅（`open` / `close` / `message` / `error` / `reconnect` / `status`）
- 可自定义消息解析与主题分发

### 地图（`src/service/map/`）

基于 Leaflet 封装的 `MapManager`，提供：

- 底图切换（`MapTileLayers`）
- 点标记（`MapMarker`）
- 线 / 面 / 圆 / 矩形（`MapPolylines`、`MapPolygons`、`MapCircle`、`MapRectangles`）
- 轨迹动画（`MapTrajectories`，含 ant-path、trackplayer）
- 图层分组（`MapLayerGroups`）
- 地图绘制（`MapDraw`：点 / 线 / 面 / 圆 / 矩形，基于 leaflet-geoman）
- 常用工具（`MapTool`：默认图标修复等）

### 音视频播放

- **FLV 直播**：`src/service/flv/FlvManger.ts`，支持自动重连、事件回调
- **WebRTC 拉流**：`src/service/rtc/WebRtcManager.ts`，支持 WHEP 协议（见 `WHEP.md`）

---

## 项目结构

```txt
src/
├── assets/              # 静态资源
├── pages/               # 页面（按路由组织）
├── router/              # Vue Router 配置
├── service/
│   ├── flv/             # FLV 播放器
│   ├── map/             # Leaflet 地图封装
│   │   ├── map-draw/    # 地图绘制
│   │   └── map-element-playup/  # 覆盖物管理
│   ├── rtc/             # WebRTC 播放
│   └── socket/          # WebSocket 管理
├── types/               # 全局类型声明
├── utils/               # 工具函数（request、env、jwt 等）
├── App.vue
├── main.ts
└── style.css            # 全局样式（含 Tailwind）
```

---

## 快速开始

### 环境要求

- Node.js >= 18
- npm（或 pnpm / yarn）

### 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建产物
npm run preview
```

### 开发指南

1. **修改项目信息**：编辑 `package.json` 中的 name、description、author 等字段
2. **配置环境变量**：按需调整 `.env.development` / `.env.production`
3. **添加页面**：在 `src/pages/` 目录下创建页面组件
4. **注册路由**：在 `src/router/index.ts` 中添加路由配置
5. **按需删减**：根据项目需求，删除 `src/service/` 中不需要的模块（地图、WebSocket、音视频等）

---

## 常用命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建产物
npm run preview

# 代码检查
npm run lint

# 自动修复代码问题
npm run lint:fix

# 格式化代码
npm run format

# 检查代码格式
npm run format:check
```

---

## 使用说明

### 环境变量配置

在项目根目录的 `.env.development` / `.env.production` 中配置，变量需以 `VITE_` 为前缀：

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | HTTP 接口基础地址 | `/api` |
| `VITE_API_RTC_URL` | WebRTC / WHEP 服务地址 | `https://example.com/whep` |

访问环境变量：
```typescript
// 方式 1：直接访问
import.meta.env.VITE_API_BASE_URL

// 方式 2：通过封装的工具函数
communalFunction.env.getEnv('VITE_API_BASE_URL')
```

### HTTP 请求

项目内置了基于 Axios 的请求封装（`src/utils/request.ts`）：

```typescript
import { request } from '@/utils/request'

// GET 请求
const data = await request.get<ResponseType>('/api/users')

// POST 请求
const result = await request.post('/api/users', { name: 'xxx' })
```

特性：
- 自动携带 Bearer Token（从 localStorage 读取 `gcs-token`）
- 统一错误处理（401 自动跳转登录）
- 支持泛型，提供完整的类型提示

### WebSocket 使用

使用 `WebSocketManager` 进行实时通信（`src/service/socket/`）：

```typescript
import { WebSocketManager } from '@/service/socket/WebSocketManager'

const ws = new WebSocketManager('ws://example.com/socket')

// 监听消息
ws.on('message', (data) => {
  console.log('收到消息:', data)
})

// 发送消息
ws.send({ type: 'ping' })

// 断开连接
ws.disconnect()
```

特性：
- 自动重连（指数退避策略）
- 心跳保活
- 断线消息队列
- 事件总线订阅

### 地图功能

使用 `MapManager` 进行地图操作（`src/service/map/`）：

```typescript
import { MapManager } from '@/service/map/MapManager'

const map = new MapManager('map-container')

// 添加标记
map.marker.add({ id: '1', latlng: [39.9, 116.4], popup: '北京' })

// 绘制线
map.polyline.add({ id: 'route1', latlngs: [[39.9, 116.4], [31.2, 121.5]] })

// 启用绘制工具
map.draw.enable('marker')
```

### 音视频播放

**FLV 直播**：
```typescript
import { FlvManager } from '@/service/flv/FlvManger'

const player = new FlvManager('video-element')
player.load('https://example.com/live.flv')
```

**WebRTC/WHEP**：
```typescript
import { WebRtcManager } from '@/service/rtc/WebRtcManager'

const rtc = new WebRtcManager('video-element')
await rtc.play('https://example.com/whep/stream')
```

---

## 项目规范

### 代码风格

- **ESLint**：采用 `@antfu/eslint-config`，内置 TypeScript、Vue、Prettier 规则
- **Prettier**：统一代码格式化，自动排序 Tailwind class
- 配置文件：`eslint.config.ts`、`prettier.config.ts`

### 目录结构建议

- `src/pages/`：页面组件，按功能模块组织
- `src/components/`：通用组件，会自动注册
- `src/service/`：业务逻辑封装（API、WebSocket、地图等）
- `src/utils/`：工具函数
- `src/types/`：TypeScript 类型定义

---

## 技术文档

更多详细信息，请查看项目内的文档：

- WebSocket 使用指南：`src/service/socket/`
- 地图功能说明：`src/service/map/`
- FLV 播放器：`src/service/flv/FlvManger.md`
- WebRTC/WHEP：`src/service/rtc/WHEP.md`

---

## 相关链接

- [VuePlus 脚手架](https://www.npmjs.com/package/create-vueplus)
- [Vue 3 文档](https://cn.vuejs.org/)
- [Vite 文档](https://cn.vitejs.dev/)
- [Element Plus](https://element-plus.org/zh-CN/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## License

MIT
