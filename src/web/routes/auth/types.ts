import type { Request, Response } from 'express';

export type CheckAuthQueryParameters = { readonly userId: string };

export type CheckAuthResponseBody = {
	readonly type: '3LO';
	readonly authorized: boolean;
	readonly grant?: {
		readonly authorizationEndpoint: string;
	};
};

export type CheckAuthRequest = Request<
	Record<string, never>,
	CheckAuthResponseBody,
	never,
	CheckAuthQueryParameters,
	Record<string, never>
>;

export type CheckAuthResponse = Response<
	CheckAuthResponseBody,
	Record<string, never>
>;
