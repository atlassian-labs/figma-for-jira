import type { Request, Response } from 'express';

import type {
	ConnectInstallation,
	FigmaTeamSummary,
} from '../../../domain/entities';

export type ConnectFigmaTeamRouteParams = {
	readonly teamId: string;
};

type ConnectFigmaTeamLocals = {
	readonly connectInstallation: ConnectInstallation;
	readonly atlassianUserId: string;
};

export type ConnectFigmaTeamRequest = Request<
	ConnectFigmaTeamRouteParams,
	never,
	never,
	Record<string, never>,
	ConnectFigmaTeamLocals
>;

export type ConnectTeamResponseBody = {
	readonly success: string[];
	readonly error: string[];
};

export type ConnectFigmaTeamResponse = Response<
	ConnectTeamResponseBody,
	ConnectFigmaTeamLocals
>;

export type DisconnectFigmaTeamRouteParams = {
	readonly teamId: string;
};

export type DisconnectFigmaTeamLocals = {
	readonly connectInstallation: ConnectInstallation;
};

export type DisconnectFigmaTeamRequest = Request<
	DisconnectFigmaTeamRouteParams,
	never,
	never,
	Record<string, never>,
	DisconnectFigmaTeamLocals
>;

export type DisconnectFigmaTeamResponse = Response<
	never,
	DisconnectFigmaTeamLocals
>;

export type ListFigmaTeamsLocals = {
	readonly connectInstallation: ConnectInstallation;
};

export type ListFigmaTeamsResponseBody = ReadonlyArray<FigmaTeamSummary>;

export type ListFigmaTeamsResponse = Response<
	ListFigmaTeamsResponseBody,
	ListFigmaTeamsLocals
>;
