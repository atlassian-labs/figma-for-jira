import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default () => {
	return defineConfig({
		base:
			(process.env['VITE_FIGMA_FOR_JIRA_APP_BASE_PATH'] ?? '') +
			'/static/admin',
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
