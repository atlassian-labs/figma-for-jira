import { type AxiosResponse } from 'axios';

import { axiosRest } from './axiosInstance';

export type CheckAuthResponseBody =
	| {
			readonly type: '3LO';
			readonly authorized: true;
			readonly grant: {
				readonly authorizationEndpoint: string;
			};
			readonly email: string;
	  }
	| {
			readonly type: '3LO';
			readonly authorized: false;
			readonly grant: {
				readonly authorizationEndpoint: string;
			};
	  };

export async function checkAuth(
	atlassianUserId: string,
): Promise<AxiosResponse<CheckAuthResponseBody>> {
	return await axiosRest.get<CheckAuthResponseBody>('/auth/checkAuth', {
		params: { userId: atlassianUserId },
	});
}
