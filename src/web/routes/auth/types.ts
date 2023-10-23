import type { Request, Response } from 'express';

import type { ConnectInstallation } from '../../../domain/entities';

export type CheckAuthQueryParameters = { readonly userId: string };

export type CheckAuthResponseBody = {
	readonly type: '3LO';
	readonly authorized: boolean;
	readonly grant: {
		readonly authorizationEndpoint: string;
	};
	readonly email?: string;
};

type CheckAuthRequestLocals = {
	readonly connectInstallation: ConnectInstallation;
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
