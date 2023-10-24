import type { NextFunction } from 'express';
import { Router } from 'express';

import type { CheckAuthRequest, CheckAuthResponse } from './types';

import { figmaAuthService } from '../../../../infrastructure/figma';
import { checkUserFigmaAuthUseCase } from '../../../../usecases';

export const authRouter = Router();

/**
 * Checks whether the given Atlassian admin is authorized to call Figma API.
 */
authRouter.get(
	['/checkAuth'],
	function (req: CheckAuthRequest, res: CheckAuthResponse, next: NextFunction) {
		const { connectInstallation, atlassianUserId } = res.locals;

		checkUserFigmaAuthUseCase
			.execute(atlassianUserId, connectInstallation)
			.then((authorized) => {
				if (authorized) {
					return res.send({ authorized });
				}

				const authorizationEndpoint =
					figmaAuthService.createOAuth2AuthorizationRequest({
						atlassianUserId,
						connectInstallation,
						redirectEndpoint: `figma/oauth/callback`,
					});

				return res.send({
					authorized,
					grant: { authorizationEndpoint },
				});
			})
			.catch((error) => next(error));
	},
);
