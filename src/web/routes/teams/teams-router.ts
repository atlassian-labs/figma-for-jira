import { HttpStatusCode } from 'axios';
import type { NextFunction, Request } from 'express';
import { Router } from 'express';

import {
	CONNECT_FIGMA_TEAM_ROUTE_PARAMS_SCHEMA,
	DISCONNECT_FIGMA_TEAM_ROUTE_PARAMS_SCHEMA,
} from './schemas';
import type {
	ConnectFigmaTeamRequest,
	ConnectFigmaTeamResponse,
	DisconnectFigmaTeamRequest,
	DisconnectFigmaTeamResponse,
	ListFigmaTeamsResponse,
} from './types';

import { assertSchema } from '../../../infrastructure';
import {
	connectFigmaTeamUseCase,
	disconnectFigmaTeamUseCase,
	listFigmaTeamsUseCase,
} from '../../../usecases';
import { jiraContextSymmetricJwtAuthMiddleware } from '../../middleware/jira';

export const teamsRouter = Router();

teamsRouter.use(jiraContextSymmetricJwtAuthMiddleware);

teamsRouter.get(
	'/',
	(req: Request, res: ListFigmaTeamsResponse, next: NextFunction) => {
		const { connectInstallation } = res.locals;

		listFigmaTeamsUseCase
			.execute(connectInstallation)
			.then((teams) => res.status(HttpStatusCode.Ok).send(teams))
			.catch(next);
	},
);

teamsRouter.post(
	'/:teamId/connect',
	(
		req: ConnectFigmaTeamRequest,
		res: ConnectFigmaTeamResponse,
		next: NextFunction,
	) => {
		assertSchema(req.params, CONNECT_FIGMA_TEAM_ROUTE_PARAMS_SCHEMA);
		const { atlassianUserId, connectInstallation } = res.locals;

		connectFigmaTeamUseCase
			.execute(req.params.teamId, atlassianUserId, connectInstallation)
			.then(() => res.sendStatus(HttpStatusCode.Ok))
			.catch(next);
	},
);

teamsRouter.delete(
	'/:teamId/disconnect',
	(
		req: DisconnectFigmaTeamRequest,
		res: DisconnectFigmaTeamResponse,
		next: NextFunction,
	) => {
		assertSchema(req.params, DISCONNECT_FIGMA_TEAM_ROUTE_PARAMS_SCHEMA);
		const { connectInstallation } = res.locals;

		disconnectFigmaTeamUseCase
			.execute(req.params.teamId, connectInstallation)
			.then(() => res.sendStatus(HttpStatusCode.Ok))
			.catch(next);
	},
);
