import type { Request, Response } from 'express';

import type {
	AtlassianDesign,
	ConnectInstallation,
} from '../../../domain/entities';

export type EntitiesRequestLocals = {
	readonly connectInstallation: ConnectInstallation;
};

// Types for /entities/associateEntity contract
export type AssociateEntityRequestQueryParameters = { readonly userId: string };

export type AssociateEntityRequestBody = {
	readonly entity: {
		readonly url: string;
	};
	readonly associateWith: {
		readonly ati: string;
		readonly ari: string;
		readonly cloudId: string;
		readonly id: string;
	};
};

export type AssociateEntityRequestResponseBody = AtlassianDesign;

export type AssociateEntityRequest = Request<
	Record<string, never>,
	AssociateEntityRequestResponseBody,
	AssociateEntityRequestBody,
	AssociateEntityRequestQueryParameters,
	EntitiesRequestLocals
>;

export type AssociateEntityResponse = Response<
	AssociateEntityRequestResponseBody,
	EntitiesRequestLocals
>;

// Types for /entities/disassociateEntity contract
export type DisassociateEntityRequestQueryParameters = {
	readonly userId: string;
};

export type DisassociateEntityRequestBody = {
	readonly entity: {
		readonly ari: string;
		readonly id: string;
	};
	readonly disassociateFrom: {
		readonly ati: string;
		readonly ari: string;
		readonly cloudId: string;
		readonly id: string;
	};
};

export type DisassociateEntityRequestResponseBody = AtlassianDesign;

export type DisassociateEntityRequest = Request<
	Record<string, never>,
	DisassociateEntityRequestResponseBody,
	DisassociateEntityRequestBody,
	DisassociateEntityRequestQueryParameters,
	EntitiesRequestLocals
>;

export type DisassociateEntityResponse = Response<
	DisassociateEntityRequestResponseBody,
	EntitiesRequestLocals
>;
