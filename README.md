# VuePlus

一个由我**自行搭建的 Vue 3 项目基座**，基于 **Vite + TypeScript**，整合了常用工程化配置和业务层封装，用于**快速启动新项目**，避免每次从零搭建。

该项目不是脚手架生成物，而是一个**可长期维护、复制复用的工程模板**——新项目只需在此基础上添加页面和业务逻辑即可。

---

## 适用场景

- 需要 **Vue 3 + TypeScript** 的中后台或可视化前端项目
- 项目涉及 **HTTP 接口、WebSocket 实时通信、地图展示、音视频播放** 等常见能力
- 希望统一 **代码规范、目录结构、请求封装** 等工程约定

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

# 类型检查 + 生产构建
npm run build

# 预览构建产物
npm run preview
```

### 作为新项目基座使用

1. 复制或克隆本仓库到新项目目录
2. 修改 `package.json` 中的 `name` 等字段
3. 按需调整 `.env.development` / `.env.production` 中的环境变量
4. 在 `src/pages/` 添加页面，并在 `src/router/index.ts` 注册路由
5. 删除或保留 `src/service/` 中不需要的模块

---

## 环境变量

在项目根目录的 `.env.development` / `.env.production` 中配置，变量需以 `VITE_` 为前缀：

| 变量 | 说明 |
| --- | --- |
| `VITE_API_BASE_URL` | HTTP 接口基础地址（默认 `/api`） |
| `VITE_API_RTC_URL` | WebRTC / WHEP 服务地址（按需配置） |

运行时可通过 `communalFunction.env.getEnv('VITE_API_BASE_URL')` 或 `import.meta.env.VITE_API_BASE_URL` 访问。

---

## 常用命令

```bash
# 代码检查
npm run lint

# 自动修复
npm run lint:fix

# 格式化
npm run format

# 检查格式
npm run format:check
```

---

## ESLint 规范

采用 **ESLint v9（Flat Config）** + **@antfu/eslint-config**：

- 内置 TypeScript、Vue、Prettier 规则，无需单独安装各类 `eslint-plugin-*`
- 偏向一致性、可读性与工程实践
- 支持 `npm run lint:fix` 自动修复

配置文件：`eslint.config.ts`

---

## 依赖说明

### 运行时依赖（dependencies）

| 依赖 | 说明 |
| --- | --- |
| `vue` / `vue-router` / `pinia` | 核心框架、路由、状态管理 |
| `element-plus` | UI 组件库 |
| `axios` | HTTP 请求 |
| `@vueuse/core` | Composition API 工具集 |
| `leaflet` 及相关插件 | 地图与绘制、轨迹 |
| `flv.js` | FLV 直播播放 |
| `jwt-decode` | JWT 解析 |
| `echarts` | 图表（按需引入） |
| `sass` | SCSS 预处理器 |
| `@tailwindcss/vite` / `@tailwindcss/postcss` | Tailwind CSS v4 集成 |

### 开发依赖（devDependencies）

| 依赖 | 说明 |
| --- | --- |
| `vite` / `@vitejs/plugin-vue` | 开发与构建 |
| `typescript` / `vue-tsc` | 类型检查 |
| `eslint` / `@antfu/eslint-config` | 代码规范 |
| `prettier` / `prettier-plugin-tailwindcss` | 格式化与 Tailwind class 排序 |
| `unplugin-auto-import` / `unplugin-vue-components` | 自动导入 |
| `tailwindcss` | 原子化 CSS |
