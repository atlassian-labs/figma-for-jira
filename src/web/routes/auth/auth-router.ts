import type { NextFunction } from 'express';
import { Router } from 'express';

import { CHECK_AUTH_QUERY_PARAMETERS_SCHEMA } from './schemas';
import type { CheckAuthRequest, CheckAuthResponse } from './types';

import { getConfig } from '../../../config';
import { assertSchema } from '../../../infrastructure';
import { figmaAuthService } from '../../../infrastructure/figma';
import { checkUserFigmaAuthUseCase } from '../../../usecases';

export const authRouter = Router();

/**
 * Checks whether the given Atlassian user is authorized to call Figma API.
 *
 * TODO: Replace with a link to public documentation.
 * @see https://hello.atlassian.net/wiki/spaces/MDT/pages/2796005496/RFC+-+Extending+generic+containers+specification+for+entity+associations#New-Provider-Actions
 */
authRouter.get(
	['/checkAuth', '/check3LO'], // TODO: Remove `check3LO` once the action is deleted.
	function (req: CheckAuthRequest, res: CheckAuthResponse, next: NextFunction) {
		assertSchema(req.query, CHECK_AUTH_QUERY_PARAMETERS_SCHEMA);
		const atlassianUserId = req.query.userId;

		checkUserFigmaAuthUseCase
			.execute(atlassianUserId)
			.then((authorized) => {
				if (authorized) {
					return res.send({ type: '3LO', authorized });
				}

				const authorizationEndpoint =
					figmaAuthService.buildAuthorizationEndpoint(
						atlassianUserId,
						`${getConfig().app.baseUrl}/figma/oauth/callback`,
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
