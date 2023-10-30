import type { Request, Response } from 'express';

import type { ConnectInstallation } from '../../../../domain/entities';

export type CheckAuthQueryParameters = { readonly userId: string };

export type CheckAuthResponseBody = {
	readonly authorized: boolean;
	readonly grant: {
		readonly authorizationEndpoint: string;
	};
	readonly user?: {
		readonly email: string;
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
