import { HttpStatusCode } from 'axios';
import type { NextFunction, Request } from 'express';
import { Router } from 'express';

import {
	CONFIGURE_FIGMA_TEAMS_REQUEST_BODY,
	REMOVE_FIGMA_TEAM_QUERY_PARAMS_SCHEMA,
} from './schemas';
import type {
	ConfigureFigmaTeamsRequest,
	ConfigureFigmaTeamsResponse,
	ListFigmaTeamsResponse,
	RemoveFigmaTeamRequest,
	RemoveFigmaTeamResponse,
} from './types';

import { assertSchema } from '../../../infrastructure';
import {
	configureFigmaTeamUseCase,
	listFigmaTeamsUseCase,
	removeFigmaTeamUseCase,
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

teamsRouter.delete(
	'/configure',
	(
		req: RemoveFigmaTeamRequest,
		res: RemoveFigmaTeamResponse,
		next: NextFunction,
	) => {
		assertSchema(req.query, REMOVE_FIGMA_TEAM_QUERY_PARAMS_SCHEMA);
		const { teamId } = req.query;
		const { connectInstallation } = res.locals;

		removeFigmaTeamUseCase
			.execute(teamId, connectInstallation.id)
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
