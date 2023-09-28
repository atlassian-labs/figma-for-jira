import type { Request, Response } from 'express';

import type { ConnectInstallation } from '../../../domain/entities';

export type AuthCallbackQueryParameters = {
	readonly code: string;
	readonly state: string;
};

export type AuthCallbackRequest = Request<
	Record<string, never>,
	never,
	never,
	AuthCallbackQueryParameters,
	Record<string, never>
>;

export type CheckAuthQueryParameters = { readonly userId: string };

export type CheckAuthResponseBody = {
	readonly type: '3LO';
	readonly authorized: boolean;
	readonly grant?: {
		readonly authorizationEndpoint: string;
	};
};

type CheckAuthRequestLocals = {
	readonly connectInstallation: ConnectInstallation;
	readonly atlassianUserId: string;
};

export type CheckAuthRequest = Request<
	Record<string, never>,
	CheckAuthResponseBody,
	never,
	CheckAuthQueryParameters,
	CheckAuthRequestLocals
>;

export type CheckAuthResponse = Response<
	CheckAuthResponseBody,
	CheckAuthRequestLocals
>;
