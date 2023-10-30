import type { NextFunction } from 'express';
import { Router } from 'express';

import { CHECK_AUTH_REQUEST_SCHEMA } from './schemas';
import type { CheckAuthRequest, CheckAuthResponse } from './types';

import { figmaAuthService } from '../../../infrastructure/figma';
import { currentFigmaUserUseCase } from '../../../usecases';
import { requestSchemaValidationMiddleware } from '../../middleware';
import { jiraServerSymmetricJwtAuthMiddleware } from '../../middleware/jira';

export const authRouter = Router();

authRouter.use(jiraServerSymmetricJwtAuthMiddleware);

/**
 * Checks whether the given Atlassian user is authorized to call Figma API.
 */
authRouter.get(
	['/checkAuth'],
	requestSchemaValidationMiddleware(CHECK_AUTH_REQUEST_SCHEMA),
	function (req: CheckAuthRequest, res: CheckAuthResponse, next: NextFunction) {
		const { connectInstallation } = res.locals;
		const atlassianUserId = req.query.userId;

		currentFigmaUserUseCase
			.execute(atlassianUserId, connectInstallation)
			.then((currentUser) => {
				const authorized = currentUser != null;
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
