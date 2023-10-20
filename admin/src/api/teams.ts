import { type AxiosResponse } from 'axios';

import { axiosRest } from './axiosInstance';

export enum FigmaTeamAuthStatus {
	OK = 'OK',
	ERROR = 'ERROR',
}

export type FigmaTeamSummary = {
	readonly teamId: string;
	readonly teamName: string;
	readonly authStatus: FigmaTeamAuthStatus;
};

export async function getTeams(): Promise<
	AxiosResponse<ReadonlyArray<FigmaTeamSummary>>
> {
	return await axiosRest.get('/teams');
}

export async function connectTeam(
	teamId: string,
): Promise<AxiosResponse<void>> {
	return await axiosRest.post(`/teams/${teamId}/connect`);
}
