import type { Request, Response } from 'express';

import type { ConnectInstallation } from '../../../../domain/entities';

export type MeQueryParameters = { readonly userId: string };

export type MeResponseBody = {
	readonly user?: {
		readonly email: string;
	};
	readonly authorizationEndpoint: string;
};

type MeRequestLocals = {
	readonly connectInstallation: ConnectInstallation;
	readonly atlassianUserId: string;
};

export type MeRequest = Request<
	Record<string, never>,
	MeResponseBody,
	never,
	MeQueryParameters,
	MeRequestLocals
>;

export type MeResponse = Response<MeResponseBody, MeRequestLocals>;
