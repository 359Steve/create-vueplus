# VuePlus(Vue 3 + TypeScript + Vite)

一个由我**自行搭建的 Vue 3 项目基础框架**，基于 **Vite + TypeScript**，整合了 **Tailwind CSS、ESLint（antfu 规范）、Prettier** 等常用工程化工具，用于**快速、规范地搭建前端项目**。

该项目不是脚手架生成物，而是一个**可长期维护和扩展的工程基座**。

---

## 技术栈

- **Vue 3**（Composition API）
- **Vite**
- **TypeScript**
- **Tailwind CSS v4**
- **ESLint v9（Flat Config）**
- **@antfu/eslint-config**
- **Prettier**
- **Vue Router**
- **Axios**
- **VueUse**

---

## 项目依赖说明

### 运行时依赖（dependencies）

| 依赖                      | 说明                                 |
| ------------------------- | ------------------------------------ |
| `vue`                     | Vue 3 核心框架                       |
| `vue-router`              | 官方路由解决方案                     |
| `axios`                   | HTTP 请求库                          |
| `@vueuse/core`            | 常用 Composition API 工具集          |
| `sass`                    | SCSS 预处理器支持                    |
| `unplugin-auto-import`    | 自动导入 API（如 `ref`、`computed`） |
| `unplugin-vue-components` | 自动导入 Vue 组件                    |
| `@tailwindcss/vite`       | Tailwind CSS 与 Vite 集成            |
| `@tailwindcss/postcss`    | Tailwind PostCSS 支持                |
| `@types/vue-router`       | Vue Router 类型声明                  |

---

### 开发依赖（devDependencies）

| 依赖                          | 说明                                        |
| ----------------------------- | ------------------------------------------- |
| `vite`                        | 开发服务器与构建工具                        |
| `@vitejs/plugin-vue`          | Vite 的 Vue 插件                            |
| `typescript`                  | TypeScript 支持                             |
| `vue-tsc`                     | Vue + TS 类型检查                           |
| `eslint`                      | 代码质量与规范检查                          |
| `@antfu/eslint-config`        | ESLint 集成配置（JS / TS / Vue / Prettier） |
| `prettier`                    | 代码格式化工具                              |
| `prettier-plugin-tailwindcss` | Tailwind class 自动排序                     |
| `@types/node`                 | Node.js 类型支持                            |
| `postcss`                     | CSS 处理工具                                |
| `@vue/tsconfig`               | Vue 官方 TS 基础配置                        |

---

## ESLint 规范说明

本项目采用：

- **ESLint v9（Flat Config）**
- **@antfu/eslint-config**

特点：

- 无需手动安装 `eslint-plugin-*`
- 内置：
    - TypeScript 解析与规则
    - Vue 规则
    - Prettier 冲突规则处理
- 偏向 **一致性 / 可读性 / 工程实践**
- 支持自动修复

### 常用命令

```bash
# 代码检查
pnpm lint

# 自动修复
pnpm lint:fix

```
