import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';
import faroUploader from '@grafana/faro-rollup-plugin';

export default defineConfig((mode) => {
	return {
		plugins: [
			sveltekit(),
			tailwindcss(),
			paraglideVitePlugin({
				project: './project.inlang',
				outdir: './src/lib/paraglide',
				cookieName: 'locale',
				strategy: ['cookie', 'preferredLanguage', 'baseLocale']
			}),

			// Create gzip-compressed files
			viteCompression({
				disable: mode.isPreview,
				algorithm: 'gzip',
				ext: '.gz',
				filter: /\.(js|mjs|json|css)$/i
			}),

			// Create brotli-compressed files
			viteCompression({
				disable: mode.isPreview,
				algorithm: 'brotliCompress',
				ext: '.br',
				filter: /\.(js|mjs|json|css)$/i
			}),

			// Upload source mpa
			faroUploader({
				appName: 'pocket-id-web',
				endpoint: process.env.FARO_ENDPOINT!,
				appId: process.env.FARO_APP_ID!,
				stackId: process.env.FARO_STACK_ID!,
				verbose: true,
				apiKey: process.env.FARO_API_KEY!,
				gzipContents: true
			})
		],

		server: {
			host: process.env.HOST,
			proxy: {
				'/api': {
					target: process.env.DEVELOPMENT_BACKEND_URL || 'http://localhost:1411'
				},
				'/.well-known': {
					target: process.env.DEVELOPMENT_BACKEND_URL || 'http://localhost:1411'
				}
			}
		},

		build: {
			ssr: false,
			rolldownOptions: {
				output: {
					minify: true,
					codeSplitting: {
						groups: [
							{ test: /node_modules/, name: 'vendor' },
							{ test: /frontend\/src\/lib\/components/, name: 'components' },
							{ test: /frontend\/src\/routes/, name: 'routes' }
						]
					}
				}
			}
		}
	};
});
