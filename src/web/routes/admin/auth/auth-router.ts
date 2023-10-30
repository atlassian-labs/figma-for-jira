import type { NextFunction } from 'express';
import { Router } from 'express';

import type { CheckAuthRequest, CheckAuthResponse } from './types';

import { figmaAuthService } from '../../../../infrastructure/figma';
import { currentFigmaUserUseCase } from '../../../../usecases';

export const authRouter = Router();

/**
 * Checks whether the given Atlassian admin is authorized to call Figma API.
 */
authRouter.get(
	['/checkAuth'],
	function (req: CheckAuthRequest, res: CheckAuthResponse, next: NextFunction) {
		const { connectInstallation, atlassianUserId } = res.locals;

		currentFigmaUserUseCase
			.execute(atlassianUserId, connectInstallation)
			.then((currentUser) => {
				const authorizationEndpoint =
					figmaAuthService.createOAuth2AuthorizationRequest({
						atlassianUserId,
						connectInstallation,
						redirectEndpoint: `figma/oauth/callback`,
					});

				if (currentUser) {
					return res.send({
						authorized: true,
						user: { email: currentUser.email },
						grant: { authorizationEndpoint },
					});
				}

				return res.send({
					authorized: false,
					grant: { authorizationEndpoint },
				});
			})
			.catch((error) => next(error));
	},
);
