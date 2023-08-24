import { Router, Request, Response } from 'express';

import type { TypedRequest } from './types';
import { addOAuthCredentialsUseCase, check3loUseCase } from '../../usecases';
import { isString } from '../../common/stringUtils';

const AUTH_RESOURCE_BASE_PATH = '/public/index.html';

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
