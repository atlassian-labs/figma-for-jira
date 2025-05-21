import type { NextFunction } from 'express';
import { Router } from 'express';

import { CHECK_AUTH_REQUEST_SCHEMA } from './schemas';
import type { CheckAuthRequest, CheckAuthResponse } from './types';

import { figmaAuthService } from '../../../infrastructure/figma';
import { checkUserFigmaAuthUseCase } from '../../../usecases';
import { requestSchemaValidationMiddleware } from '../../middleware';
import { jiraServerToServerSymmetricJwtAuthenticationMiddleware } from '../../middleware/jira';

export const authRouter = Router();

authRouter.use(jiraServerToServerSymmetricJwtAuthenticationMiddleware);

/**
 * Checks whether the given Atlassian user is authorized to call Figma API.
 */
authRouter.get(
	['/checkAuth'],
	requestSchemaValidationMiddleware(CHECK_AUTH_REQUEST_SCHEMA),
	function (req: CheckAuthRequest, res: CheckAuthResponse, next: NextFunction) {
		const { connectInstallation } = res.locals;
		const atlassianUserId = req.query.userId;

		checkUserFigmaAuthUseCase
			.execute(atlassianUserId, connectInstallation)
			.then((authorized) => {
				if (authorized) {
					return res.send({ type: '3LO', authorized });
				}

				const authorizationEndpoint =
					figmaAuthService.createOAuth2AuthorizationRequest({
						atlassianUserId,
						connectInstallation,
						redirectEndpoint: `figma/oauth/callback`,
					});

				return res.send({
					type: '3LO',
					authorized,
					grant: { authorizationEndpoint },
				});
			})
			.catch((error) => next(error));
	},
);
