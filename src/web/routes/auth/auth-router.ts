import type { NextFunction } from 'express';
import { Router } from 'express';

import { CHECK_AUTH_QUERY_PARAMETERS_SCHEMA } from './schemas';
import type { CheckAuthRequest, CheckAuthResponse } from './types';

import { getConfig } from '../../../config';
import { assertSchema } from '../../../infrastructure';
import { figmaAuthService } from '../../../infrastructure/figma';
import { checkUserFigmaAuthUseCase } from '../../../usecases';
import { jiraServerSymmetricJwtAuthMiddleware } from '../../middleware/jira';

export const authRouter = Router();

authRouter.use(jiraServerSymmetricJwtAuthMiddleware);

/**
 * Checks whether the given Atlassian user is authorized to call Figma API.
 *
 * TODO: Replace with a link to public documentation.
 * @see https://hello.atlassian.net/wiki/spaces/MDT/pages/2796005496/RFC+-+Extending+generic+containers+specification+for+entity+associations#New-Provider-Actions
 */
authRouter.get(
	['/checkAuth'],
	function (req: CheckAuthRequest, res: CheckAuthResponse, next: NextFunction) {
		assertSchema(req.query, CHECK_AUTH_QUERY_PARAMETERS_SCHEMA);
		const { connectInstallation } = res.locals;
		const atlassianUserId = req.query.userId;

		checkUserFigmaAuthUseCase
			.execute(atlassianUserId, connectInstallation)
			.then((figmaUserEmail) => {
				const authorizationEndpoint =
					figmaAuthService.buildAuthorizationEndpoint(
						{
							connectInstallationId: connectInstallation.id,
							atlassianUserId,
						},
						`${getConfig().app.baseUrl}/figma/oauth/callback`,
					);

				if (figmaUserEmail) {
					return res.send({
						type: '3LO',
						authorized: true,
						grant: { authorizationEndpoint },
						email: figmaUserEmail,
					});
				}

				return res.send({
					type: '3LO',
					authorized: false,
					grant: { authorizationEndpoint },
				});
			})
			.catch((error) => next(error));
	},
);
