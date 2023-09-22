import { HttpStatusCode } from 'axios';
import type { NextFunction } from 'express';
import { Router } from 'express';

import { CONFIGURE_FIGMA_TEAMS_REQUEST_BODY } from './schemas';
import type {
	ConfigureFigmaTeamsRequest,
	ConfigureFigmaTeamsResponse,
} from './types';

import { assertSchema } from '../../../infrastructure';
import { configureFigmaTeamUseCase } from '../../../usecases';
import {
	authHeaderSymmetricJwtMiddleware,
	extractUserIdFromHeadersMiddleware,
} from '../../middleware';

export const configureRouter = Router();

configureRouter.use(
	extractUserIdFromHeadersMiddleware,
	authHeaderSymmetricJwtMiddleware,
);

configureRouter.post(
	'/team',
	(
		req: ConfigureFigmaTeamsRequest,
		res: ConfigureFigmaTeamsResponse,
		next: NextFunction,
	) => {
		assertSchema(req.body, CONFIGURE_FIGMA_TEAMS_REQUEST_BODY);
		const { atlassianUserId, connectInstallation } = res.locals;

		configureFigmaTeamUseCase
			.execute(req.body.teamId, atlassianUserId, connectInstallation)
			.then(() => res.sendStatus(HttpStatusCode.Ok))
			.catch(next);
	},
);
