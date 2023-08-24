import { Router, Request, Response } from 'express';

import type { TypedRequest } from './types';
import { figmaClient, logger } from '../../infrastructure';
import { addOAuthCredentialsUseCase, check3loUseCase } from '../../usecases';
import { isString } from '../../common/stringUtils';

const AUTH_RESOURCE_BASE_PATH = '/public/index.html';
const SUCCESS_PAGE_URL = `${AUTH_RESOURCE_BASE_PATH}?success=true`;
const FAILURE_PAGE_URL = `${AUTH_RESOURCE_BASE_PATH}?success=false`;

type AuthCallbackRequestBody = {
	readonly atlassianUserId: string;
	readonly accessToken: string;
	readonly refreshToken: string;
	readonly expiresIn: number;
};

type Check3loResponseBody = {
	readonly authorised: boolean;
};

export const authRouter = Router();

/**
 * A callback called by Figma authentication server with the access token included.
 *
 * @see https://www.figma.com/developers/api#authentication
 */
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

/**
 * Checks whether the given Atlassian user is authorised to call Figma API.
 *
 * TODO: Replace with a link to public documentation.
 * @see https://hello.atlassian.net/wiki/spaces/MDT/pages/2796005496/RFC+-+Extending+generic+containers+specification+for+entity+associations#New-Provider-Actions
 */
authRouter.get(
	'/check3LO',
	function (req: Request, res: Response<Check3loResponseBody>) {
		const userId = req.query['userId'];

		// TODO: Add error handler that maps exceptions to HTTP errors.
		if (!userId || !isString(userId))
			throw new Error('A "userId" query parameter is missing.');

		check3loUseCase
			.execute(userId)
			.then((authorised) => res.send({ authorised }));
	},
);
