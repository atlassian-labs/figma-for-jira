import type { Request, Response } from 'express';

import type {
	ConnectInstallation,
	FigmaTeamSummary,
} from '../../../domain/entities';

export type ConfigureFigmaTeamRequestBody = {
	readonly teamId: string;
};

type ConfigureFigmaTeamsLocals = {
	readonly connectInstallation: ConnectInstallation;
	readonly atlassianUserId: string;
};

export type ConfigureFigmaTeamsRequest = Request<
	Record<string, never>,
	never,
	ConfigureFigmaTeamRequestBody,
	Record<string, never>,
	ConfigureFigmaTeamsLocals
>;

export type ConfigureTeamsResponseBody = {
	readonly success: string[];
	readonly error: string[];
};

export type ConfigureFigmaTeamsResponse = Response<
	ConfigureTeamsResponseBody,
	ConfigureFigmaTeamsLocals
>;

export type ListFigmaTeamsLocals = {
	readonly connectInstallation: ConnectInstallation;
};

export type ListFigmaTeamsResponseBody = ReadonlyArray<FigmaTeamSummary>;

export type ListFigmaTeamsResponse = Response<
	ListFigmaTeamsResponseBody,
	ListFigmaTeamsLocals
>;
