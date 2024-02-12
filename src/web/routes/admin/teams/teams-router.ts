import { HttpStatusCode } from 'axios';
import type { NextFunction, Request } from 'express';
import { Router } from 'express';

import type {
	ConnectFigmaTeamRequest,
	ConnectFigmaTeamResponse,
	DisconnectFigmaTeamRequest,
	DisconnectFigmaTeamResponse,
	ListFigmaTeamsResponse,
} from './types';

import {
	connectFigmaTeamUseCase,
	disconnectFigmaTeamUseCase,
	listFigmaTeamsUseCase,
} from '../../../../usecases';
import { jiraContextSymmetricJwtAuthenticationMiddleware } from '../../../middleware/jira';

export const teamsRouter = Router();

teamsRouter.use(jiraContextSymmetricJwtAuthenticationMiddleware);

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
		const { atlassianUserId, connectInstallation } = res.locals;

		connectFigmaTeamUseCase
			.execute(req.params.teamId, atlassianUserId, connectInstallation)
			.then((figmaTeamSummary) =>
				res.status(HttpStatusCode.Ok).send(figmaTeamSummary),
			)
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
		const { connectInstallation } = res.locals;

		disconnectFigmaTeamUseCase
			.execute(req.params.teamId, connectInstallation)
			.then(() => res.sendStatus(HttpStatusCode.Ok))
			.catch(next);
	},
);
