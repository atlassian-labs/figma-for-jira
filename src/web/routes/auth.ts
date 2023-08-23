import { Router } from 'express';

import type { TypedRequest } from './types';

import { figmaClient, logger } from '../../infrastructure';
import { addOAuthCredentialsUseCase } from '../../usecases/add-oauth-credentials';

const AUTH_RESOURCE_BASE_PATH = '/public/index.html';
const SUCCESS_PAGE_URL = `${AUTH_RESOURCE_BASE_PATH}?success=true`;
const FAILURE_PAGE_URL = `${AUTH_RESOURCE_BASE_PATH}?success=false`;

type AuthCallbackRequestBody = {
	readonly atlassianUserId: string;
	readonly accessToken: string;
	readonly refreshToken: string;
	readonly expiresIn: number;
};

export const authRouter = Router();

authRouter.get(
	'/callback',
	function (req: TypedRequest<AuthCallbackRequestBody>, res) {
		const { code, state } = req.query;
		if (typeof code !== 'string' || typeof state !== 'string') {
			res.statusMessage = 'Did not receive valid code or state in query params';
			res.sendStatus(500);
			return;
		}
		figmaClient
			.exchangeCodeForAccessToken(code, state)
			.then((oauthCredentials) => {
				addOAuthCredentialsUseCase
					.execute(oauthCredentials)
					.then(() => {
						res.redirect(SUCCESS_PAGE_URL);
					})
					.catch(() => {
						res.redirect(FAILURE_PAGE_URL);
					});
			})
			.catch((error) => {
				logger.error(
					`Error exchanging code for access token via Figma client ${error}`,
					error,
				);
				res.redirect(FAILURE_PAGE_URL);
			});
	},
);
