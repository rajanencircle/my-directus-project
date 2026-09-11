import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			'@directus/extensions-sdk': path.resolve(dir, 'node_modules/@directus/extensions-sdk/dist/index.js'),
		},
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify('production'),
	},
	build: {
		lib: {
			entry: path.resolve(dir, 'media-share-validate/src/viewer/main.ts'),
			name: 'ShareViewerDownload',
			formats: ['iife'],
			fileName: () => 'viewer-download.js',
		},
		outDir: path.resolve(dir, 'dist'),
		emptyOutDir: false,
		cssCodeSplit: false,
	rollupOptions: {
			output: {
				inlineDynamicImports: true,
				assetFileNames: 'viewer-download[extname]',
			},
		},
	},
});
