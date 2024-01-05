import { AxiosError } from 'axios';

import { withAxiosErrorTranslation } from './axios-utils';

describe('Axios utils', () => {
	describe('withAxiosErrorTranslation', () => {
		it('throws the error if it is not an axios error', async () => {
			const result = withAxiosErrorTranslation(() => {
				throw new Error('test error');
			}, 'some context');

			await expect(result).rejects.toThrow('test error');
		});

		it('can throw a 400 bad request error', async () => {
			const result = withAxiosErrorTranslation(() => {
				throw new AxiosError('Bad request', '400');
			});

			await expect(result).rejects.toThrow('Bad request');
		});

		it('can throw a 401 unauthorized error', async () => {
			const result = withAxiosErrorTranslation(() => {
				throw new AxiosError('Unauthorized', '401');
			});

			await expect(result).rejects.toThrow('Unauthorized');
		});

		it('can throw a 403 forbidden error', async () => {
			const result = withAxiosErrorTranslation(() => {
				throw new AxiosError('Forbidden', '403');
			});

			await expect(result).rejects.toThrow('Forbidden');
		});

		it('can throw a 404 not found error', async () => {
			const result = withAxiosErrorTranslation(() => {
				throw new AxiosError('Not Found', '404');
			});

			await expect(result).rejects.toThrow('Not Found');
		});

		it('can throw a generic http client error', async () => {
			const result = withAxiosErrorTranslation(() => {
				throw new AxiosError('Internal Server Error', '500');
			});

			await expect(result).rejects.toThrow('Internal Server Error');
		});
	});
});
