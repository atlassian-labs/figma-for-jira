import { setGlobalTheme } from '@atlaskit/tokens';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { createRoot } from 'react-dom/client';

// eslint-disable-next-line import/no-unassigned-import
import '@atlaskit/css-reset';
import { App } from './app';

setGlobalTheme({}).catch(() => {});

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
});

createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>
	</React.StrictMode>,
);
