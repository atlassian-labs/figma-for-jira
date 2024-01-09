import type { AxiosResponse } from 'axios';
import { AxiosError } from 'axios';

import { withAxiosErrorTranslation } from './axios-utils';
import {
	BadRequestHttpClientError,
	ForbiddenHttpClientError,
	HttpClientError,
	NotFoundHttpClientError,
	UnauthorizedHttpClientError,
} from './http-client-errors';

describe('Axios utils', () => {
	describe('withAxiosErrorTranslation', () => {
		it('throws the error if it is not an axios error', async () => {
			const result = withAxiosErrorTranslation(() => {
				throw new Error('test error');
			}, 'some context');

			await expect(result).rejects.toThrow('test error');
		});

		it.each([
			[BadRequestHttpClientError, 'Bad request', 400],
			[UnauthorizedHttpClientError, 'Unauthorized', 401],
			[ForbiddenHttpClientError, 'Forbidden', 403],
			[NotFoundHttpClientError, 'Not found', 404],
			[HttpClientError, 'Internal Server Error', 500],
		])(
			'should throw %s when Axios error with HTTP status %s is caught',
			async (ErrorType, message, status) => {
				const axiosError = new AxiosError(
					message,
					undefined,
					undefined,
					undefined,
					{
						status,
					} as AxiosResponse,
				);

				const result = withAxiosErrorTranslation(() => {
					throw axiosError;
				});

				await expect(result).rejects.toBeInstanceOf(ErrorType);
			},
		);
	});
});
