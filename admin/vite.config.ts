import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default () => {
	return defineConfig({
		base: '/admin',
		plugins: [
			react({
				jsxImportSource: '@emotion/react',
				babel: {
					plugins: ['@emotion/babel-plugin'],
				},
			}),
		],
	});
};
