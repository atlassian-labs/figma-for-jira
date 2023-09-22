import type { Request, Response } from 'express';

export type AuthCallbackQueryParameters = { code: string; state: string };

export type AuthCallbackRequest = Request<
	Record<string, never>,
	never,
	never,
	AuthCallbackQueryParameters,
	Record<string, never>
>;

export type CheckAuthQueryParameters = { userId: string };

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
	{ userId: string },
	Record<string, never>
>;

export type CheckAuthResponse = Response<
	CheckAuthResponseBody,
	Record<string, never>
>;
