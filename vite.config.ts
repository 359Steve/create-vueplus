import path from 'node:path';
import process from 'node:process';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { defineConfig, loadEnv } from 'vite';
// import electron from 'vite-plugin-electron/simple';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), 'VITE_');

	return {
		base: '/',
		server: {

		},
		plugins: [
			vue({
				template: {
					compilerOptions: {
						comments: false, // 生产环境下移除模版中的注释
					},
				},
			}),
			// electron({
			//     main: {
			//         entry: 'electron/main.ts',
			//     },
			//     preload: {
			//         input: 'electron/preload.ts',
			//         vite: {
			//             build: {
			//                 rollupOptions: {
			//                     output: {
			//                         format: 'cjs',
			//                         entryFileNames: 'preload.cjs',
			//                         inlineDynamicImports: true,
			//                     },
			//                 },
			//             },
			//         },
			//     },
			// }),
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
				resolvers: [
					ElementPlusResolver({
						importStyle: 'css',
					}),
				],
				dts: 'src/auto-imports.d.ts', // 生成的类型声明文件
				injectAtEnd: true,
			}),
			// 自动导入组件
			Components({
				dirs: ['src/components', 'src/*/components'], // 组件所在目录
				resolvers: [
					ElementPlusResolver({
						importStyle: 'css',
					}),
				],
				extensions: ['vue'], // 组件文件扩展名
				dts: 'src/components.d.ts', // 生成的类型声明文件
			}),
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
		build: {
			cssCodeSplit: true,
			chunkSizeWarningLimit: 1000,
			rollupOptions: {
				output: {
					dir: 'dist',
					entryFileNames: 'js/[name].[hash].js',
					chunkFileNames: 'js/[name].[hash].js',
					assetFileNames: (info) => {
						const ext = info.names?.[0]?.split('.').pop()?.toLowerCase();

						if (ext === 'css') {
							return 'css/[name].[hash][extname]';
						}

						if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext ?? '')) {
							return 'images/[name].[hash][extname]';
						}

						if (['woff', 'woff2', 'ttf', 'eot', 'otf'].includes(ext ?? '')) {
							return 'fonts/[name].[hash][extname]';
						}

						return 'assets/[name].[hash][extname]';
					},
					manualChunks(id) {
						if (!id.includes('node_modules')) {
							return;
						}

						if (id.includes('element-plus') || id.includes('@element-plus')) {
							return 'element-plus';
						}
						if (id.includes('echarts')) {
							return 'echarts';
						}
						if (
							id.includes('leaflet') ||
							id.includes('@geoman-io') ||
							id.includes('leaflet-ant-path') ||
							id.includes('leaflet-trackplayer') ||
							id.includes('leaflet.marker.slideto')
						) {
							return 'leaflet';
						}
						if (id.includes('flv.js')) {
							return 'flv';
						}
						if (id.includes('jszip')) {
							return 'jszip';
						}
						if (id.includes('axios')) {
							return 'axios';
						}
						if (
							id.includes('/vue/') ||
							id.includes('vue-router') ||
							id.includes('pinia') ||
							id.includes('@vue')
						) {
							return 'vue-vendor';
						}

						return 'vendor';
					},
				},
			},
			target: 'es2020',
		},
	};
});
