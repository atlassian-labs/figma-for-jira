import { Router } from 'express';

import type { TypedRequest } from './types';

import { AddOAuthCredentialsUseCase } from '../usecases/add-oauth-credentials';

export const authRouter = Router();

const AUTH_RESOURCE_BASE_PATH = '/public/index.html';

type AuthCallbackRequestBody = {
	readonly atlassianUserId: string;
	readonly accessToken: string;
	readonly refreshToken: string;
	readonly expiresIn: number;
};

export const makeAuthRouter = (
	addOAuthCredentialsUseCase: AddOAuthCredentialsUseCase,
) => {
	const authRouter = Router();

	authRouter.get(
		'/callback',
		function (req: TypedRequest<AuthCallbackRequestBody>, res) {
			// MDTZ-905 - TODO:
			// 1. parse url and validate `state`
			// 2. exchange `code` for `access_token`
			// 3. pass any errors from the Figma auth flow as an `errorMessage` query param in the catch block
			req.log.info('Received auth callback');
			addOAuthCredentialsUseCase
				.execute(req.body)
				.then(() => {
					res.redirect(`${AUTH_RESOURCE_BASE_PATH}?success=true`);
				})
				.catch(() => {
					res.redirect(`${AUTH_RESOURCE_BASE_PATH}?success=false`);
				});
		},
	);

	return authRouter;
};
