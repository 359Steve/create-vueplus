import path from 'node:path';
import process from 'node:process';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), 'VITE_');

    return {
        base: '/',
        plugins: [
            vue(),
            AutoImport({
                imports: [
                    'vue',
                    'vue-router',
                    '@vueuse/core',
                    'pinia',
                    {
                        '@/utils/request.ts': ['request'],
                    },
                ],
                resolvers: [ElementPlusResolver()],
                dts: 'src/auto-imports.d.ts', // 生成的类型声明文件
                injectAtEnd: true,
            }),
            // 自动导入组件
            Components({
                dirs: ['src/components', 'src/*/components'], // 组件所在目录
                resolvers: [ElementPlusResolver()],
                extensions: ['vue'], // 组件文件扩展名
                dts: 'src/components.d.ts', // 生成的类型声明文件
            }),
            tailwindcss(),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src'),
            },
        },
        optimizeDeps: {
            include: ['leaflet'], // 强制完整预构建，不做依赖裁剪
        },
        define: {
            __APP_ENV__: JSON.stringify(env),
        },
    };
});
