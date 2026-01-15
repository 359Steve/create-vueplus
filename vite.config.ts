import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
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
                    '@/utils/request': ['request'],
                },
            ],
            dts: 'src/auto-imports.d.ts', // 生成的类型声明文件
        }),
        // 自动导入组件
        Components({
            dirs: ['src/components', 'src/*/components'], // 组件所在目录
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
});
