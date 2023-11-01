import { type AxiosResponse } from 'axios';

import { axiosRest } from './axiosInstance';

export type FigmaUser = {
	readonly email: string;
};

export type MeResponseBody = {
	readonly authorizationEndpoint: string;
	readonly user?: FigmaUser;
};

export async function getAuthMe(
	atlassianUserId: string,
): Promise<AxiosResponse<MeResponseBody>> {
	return await axiosRest.get<MeResponseBody>('/admin/auth/me', {
		params: { userId: atlassianUserId },
	});
}
