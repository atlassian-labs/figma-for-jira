import type { NextFunction, Response } from 'express';
import { Router } from 'express';

import {
	AUTH_CALLBACK_QUERY_PARAMETERS_SCHEMA,
	CHECK_AUTH_QUERY_PARAMETERS_SCHEMA,
} from './schemas';
import type {
	AuthCallbackRequest,
	CheckAuthRequest,
	CheckAuthResponse,
} from './types';

import { getConfig } from '../../../config';
import { assertSchema } from '../../../infrastructure';
import { figmaAuthService } from '../../../infrastructure/figma';
import {
	addFigmaOAuthCredentialsUseCase,
	checkUserFigmaAuthUseCase,
} from '../../../usecases';
import { authHeaderSymmetricJwtMiddleware } from '../../middleware';

const AUTH_RESOURCE_BASE_PATH = '/public/index.html';
export const SUCCESS_PAGE_URL = `${AUTH_RESOURCE_BASE_PATH}?success=true`;
export const FAILURE_PAGE_URL = `${AUTH_RESOURCE_BASE_PATH}?success=false`;

export const authRouter = Router();

/**
 * Checks whether the given Atlassian user is authorized to call Figma API.
 *
 * TODO: Replace with a link to public documentation.
 * @see https://hello.atlassian.net/wiki/spaces/MDT/pages/2796005496/RFC+-+Extending+generic+containers+specification+for+entity+associations#New-Provider-Actions
 */
authRouter.get(
	['/checkAuth', '/check3LO'], // TODO: Remove `check3LO` once the action is deleted.
	authHeaderSymmetricJwtMiddleware,
	function (req: CheckAuthRequest, res: CheckAuthResponse, next: NextFunction) {
		assertSchema(req.query, CHECK_AUTH_QUERY_PARAMETERS_SCHEMA);
		const { connectInstallation, atlassianUserId } = res.locals;

		checkUserFigmaAuthUseCase
			.execute(atlassianUserId, connectInstallation)
			.then((authorized) => {
				if (authorized) {
					return res.send({ type: '3LO', authorized });
				}

				const authorizationEndpoint =
					figmaAuthService.buildAuthorizationEndpoint(
						{
							connectInstallationId: connectInstallation.id,
							atlassianUserId,
						},
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
authRouter.get('/callback', function (req: AuthCallbackRequest, res: Response) {
	assertSchema(req.query, AUTH_CALLBACK_QUERY_PARAMETERS_SCHEMA);
	const { code, state } = req.query;

	const user = figmaAuthService.getUserFromAuthorizationCallbackState(state);

	addFigmaOAuthCredentialsUseCase
		.execute(code, user)
		.then(() => {
			res.redirect(SUCCESS_PAGE_URL);
		})
		.catch(() => {
			res.redirect(FAILURE_PAGE_URL);
		});
});
