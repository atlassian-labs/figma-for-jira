import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';

import { CHECK_AUTH_REQUEST_SCHEMA } from './schemas';
import type { CheckAuthRequest, CheckAuthResponse } from './types';

import { figmaAuthService } from '../../../infrastructure/figma';
import { jiraContextSymmetricJwtTokenVerifier } from '../../../infrastructure/jira/inbound-auth';
import { checkUserFigmaAuthUseCase } from '../../../usecases';
import { UnauthorizedResponseStatusError } from '../../../web/errors';
import { requestSchemaValidationMiddleware } from '../../middleware';
// import { jiraServerSymmetricJwtAuthMiddleware } from '../../middleware/jira';

export const authRouter = Router();

authRouter.post(
	['/grant'],
	(req: Request, res: Response, next: NextFunction) => {
		const token = req.body['jwt'] as string | undefined;

		if (!token) {
			return next(new UnauthorizedResponseStatusError('Missing JWT token.'));
		}

		void jiraContextSymmetricJwtTokenVerifier
			.verify(token)
			.then(({ connectInstallation, atlassianUserId }) => {
				res.locals.connectInstallation = connectInstallation;
				res.locals.atlassianUserId = atlassianUserId;
				next();
			})
			.catch((e) =>
				next(
					new UnauthorizedResponseStatusError('Unauthorized.', undefined, e),
				),
			);
	},
	function (req: Request, res: Response) {
		const { connectInstallation, atlassianUserId } = res.locals;
		const authorizationEndpoint =
			figmaAuthService.createOAuth2AuthorizationRequest({
				atlassianUserId,
				connectInstallation,
				redirectEndpoint: `figma/oauth/callback`,
				response: res,
			});

		res.redirect(authorizationEndpoint);
	},
);

// authRouter.use(jiraServerSymmetricJwtAuthMiddleware);

/**
 * Checks whether the given Atlassian user is authorized to call Figma API.
 */
authRouter.get(
	['/checkAuth'],
	requestSchemaValidationMiddleware(CHECK_AUTH_REQUEST_SCHEMA),
	function (req: CheckAuthRequest, res: CheckAuthResponse, next: NextFunction) {
		const { connectInstallation } = res.locals;
		const atlassianUserId = req.query.userId;
		// console.log('/checkAuth');
		// console.log(req);

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
						response: res,
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
