import { HttpStatusCode } from 'axios';
import type { NextFunction, Request } from 'express';
import { Router } from 'express';

import { CONFIGURE_FIGMA_TEAMS_REQUEST_BODY } from './schemas';
import type {
	ConfigureFigmaTeamsRequest,
	ConfigureFigmaTeamsResponse,
	ListFigmaTeamsResponse,
} from './types';

import { assertSchema } from '../../../infrastructure';
import {
	configureFigmaTeamUseCase,
	listFigmaTeamsUseCase,
} from '../../../usecases';
import {
	authHeaderSymmetricJwtMiddleware,
	extractUserIdFromHeadersMiddleware,
} from '../../middleware';

export const teamsRouter = Router();

teamsRouter.use(
	extractUserIdFromHeadersMiddleware,
	authHeaderSymmetricJwtMiddleware,
);

teamsRouter.post(
	'/configure',
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

teamsRouter.get(
	'/list',
	(req: Request, res: ListFigmaTeamsResponse, next: NextFunction) => {
		const { connectInstallation } = res.locals;

		listFigmaTeamsUseCase
			.execute(connectInstallation.id)
			.then((teams) => res.status(HttpStatusCode.Ok).send(teams))
			.catch(next);
	},
);
