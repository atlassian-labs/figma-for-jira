import type { NextFunction } from 'express';
import { Router } from 'express';

import type { MeRequest, MeResponse } from './types';

import { figmaAuthService } from '../../../../infrastructure/figma';
import { getCurrentFigmaUserUseCase } from '../../../../usecases';

export const authRouter = Router();

/**
 * Checks whether the given Atlassian admin is authorized to call Figma API.
 */
authRouter.get(
	['/me'],
	function (req: MeRequest, res: MeResponse, next: NextFunction) {
		const { connectInstallation, atlassianUserId } = res.locals;

		getCurrentFigmaUserUseCase
			.execute(atlassianUserId, connectInstallation)
			.then((currentUser) => {
				const authorizationEndpoint =
					figmaAuthService.createOAuth2AuthorizationRequest({
						atlassianUserId,
						connectInstallation,
						redirectEndpoint: `/figma/oauth/callback`,
					});

				if (currentUser) {
					return res.send({
						user: { email: currentUser.email },
						authorizationEndpoint,
					});
				}

				return res.send({
					authorizationEndpoint,
				});
			})
			.catch((error) => next(error));
	},
);
