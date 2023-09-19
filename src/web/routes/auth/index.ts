import type { Request, Response } from 'express';
import { Router } from 'express';

import { isString } from '../../../common/stringUtils';
import { getConfig } from '../../../config';
import { figmaAuthService } from '../../../infrastructure/figma';
import {
	addFigmaOAuthCredentialsUseCase,
	checkUserFigmaAuthUseCase,
} from '../../../usecases';
import type { TypedRequest } from '../types';

const AUTH_RESOURCE_BASE_PATH = '/public/index.html';
export const SUCCESS_PAGE_URL = `${AUTH_RESOURCE_BASE_PATH}?success=true`;
export const FAILURE_PAGE_URL = `${AUTH_RESOURCE_BASE_PATH}?success=false`;

type CheckAuthResponseBody = {
	readonly type: '3LO';
	readonly authorized: boolean;
	readonly grant?: {
		readonly authorizationEndpoint: string;
	};
};

type AuthCallbackRequestBody = {
	readonly atlassianUserId: string;
	readonly accessToken: string;
	readonly refreshToken: string;
	readonly expiresIn: number;
};

export const authRouter = Router();

/**
 * Checks whether the given Atlassian user is authorized to call Figma API.
 *
 * TODO: Replace with a link to public documentation.
 * @see https://hello.atlassian.net/wiki/spaces/MDT/pages/2796005496/RFC+-+Extending+generic+containers+specification+for+entity+associations#New-Provider-Actions
 */
authRouter.get(
	'/checkAuth',
	function (req: Request, res: Response<CheckAuthResponseBody>, next) {
		const atlassianUserId = req.query['userId'];

		// TODO: Add error handler that maps exceptions to HTTP errors.
		if (!atlassianUserId || !isString(atlassianUserId)) {
			return next(new Error('A "userId" query parameter is missing.'));
		}

		checkUserFigmaAuthUseCase
			.execute(atlassianUserId)
			.then((authorized) => {
				if (authorized) {
					return res.send({ type: '3LO', authorized });
				}

				const authorizationEndpoint =
					figmaAuthService.buildAuthorizationEndpoint(
						atlassianUserId,
						`${getConfig().app.baseUrl}/auth/callback`,
					);

				return res.send({
					type: '3LO',
					authorized,
					grant: { authorizationEndpoint },
				});
			})
			.catch((error) => next(error));
	},
);

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
		addFigmaOAuthCredentialsUseCase
			.execute(code, state)
			.then(() => {
				res.redirect(SUCCESS_PAGE_URL);
			})
			.catch(() => {
				res.redirect(FAILURE_PAGE_URL);
			});
	},
);
