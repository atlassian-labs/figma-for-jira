import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { z } from 'zod';

import { openInBrowser } from '../utils';

const authResultSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('auth:success'),
	}),
	z.object({
		type: z.literal('auth:failure'),
		message: z.string(),
	}),
]);

export function useAuthenticate(authorizationEndpoint: string): () => void {
	const queryClient = useQueryClient();
	const authenticate = useCallback(
		function authenticateImpl() {
			const authWindow = openInBrowser(authorizationEndpoint);

			function onAuthMessage(event: MessageEvent) {
				if (event.origin !== window.location.origin) {
					return;
				}

				const authResultResult = authResultSchema.safeParse(event.data);
				if (!authResultResult.success) {
					return;
				}

				const authResult = authResultResult.data;

				switch (authResult.type) {
					case 'auth:success': {
						void queryClient.invalidateQueries({ queryKey: ['adminMe'] });
						break;
					}

					case 'auth:failure': {
						console.log(authResult.message);
						break;
					}
				}
				authWindow?.close();
				window.removeEventListener('message', onAuthMessage);
			}

			window.addEventListener('message', onAuthMessage);
		},
		[authorizationEndpoint],
	);

	return authenticate;
}
