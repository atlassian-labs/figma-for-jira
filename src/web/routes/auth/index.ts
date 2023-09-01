import type { Request, Response} from 'express';
import { Router } from 'express';

import { isString } from '../../../common/stringUtils';
import { addOAuthCredentialsUseCase, check3loUseCase } from '../../../usecases';
import type { TypedRequest } from '../types';

const AUTH_RESOURCE_BASE_PATH = '/public/index.html';
export const SUCCESS_PAGE_URL = `${AUTH_RESOURCE_BASE_PATH}?success=true`;
export const FAILURE_PAGE_URL = `${AUTH_RESOURCE_BASE_PATH}?success=false`;

type AuthCallbackRequestBody = {
	readonly atlassianUserId: string;
	readonly accessToken: string;
	readonly refreshToken: string;
	readonly expiresIn: number;
};

type Check3loResponseBody = {
	readonly authorized: boolean;
};

export const authRouter = Router();

/**
 * A callback called by Figma authentication server with the access token included.
 *
 * @see https://www.figma.com/developers/api#authentication
 */
authRouter.get(
	'/callback',
	function (req: TypedRequest<AuthCallbackRequestBody>, res, next) {
		const { code, state } = req.query;

		// TODO: Add error handler that maps exceptions to HTTP errors.
		if (typeof code !== 'string' || typeof state !== 'string') {
			return next(
				new Error('Did not receive valid code or state in query params'),
			);
		}
		addOAuthCredentialsUseCase
			.execute(code, state)
			.then(() => {
				res.redirect(SUCCESS_PAGE_URL);
			})
			.catch(() => {
				res.redirect(FAILURE_PAGE_URL);
			});
	},
);

/**
 * Checks whether the given Atlassian user is authorized to call Figma API.
 *
 * TODO: Replace with a link to public documentation.
 * @see https://hello.atlassian.net/wiki/spaces/MDT/pages/2796005496/RFC+-+Extending+generic+containers+specification+for+entity+associations#New-Provider-Actions
 */
authRouter.get(
	'/check3LO',
	function (req: Request, res: Response<Check3loResponseBody>, next) {
		const userId = req.query['userId'];

		// TODO: Add error handler that maps exceptions to HTTP errors.
		if (!userId || !isString(userId)) {
			return next(new Error('A "userId" query parameter is missing.'));
		}

		check3loUseCase
			.execute(userId)
			.then((authorized) => res.send({ authorized }))
			.catch((error) => next(error));
	},
);
