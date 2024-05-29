import type { Request, Response } from 'express';

import type {
	AtlassianDesign,
	ConnectInstallation,
} from '../../../domain/entities';

export type EntitiesRequestLocals = {
	readonly connectInstallation: ConnectInstallation;
};

/*
 * The contract of the `getEntityByUrl` action.
 * See https://developer.atlassian.com/cloud/devops-provider-actions/specifications/current/#get-entity-by-url
 */
export type GetEntityByUrlRequestQueryParameters = { readonly userId: string };

export type GetEntityByUrlRequestBody = {
	readonly entity: {
		readonly url: string;
	};
};

export type GetEntityByUrlRequestResponseBody = AtlassianDesign;

export type GetEntityByUrlRequest = Request<
	Record<string, never>,
	GetEntityByUrlRequestResponseBody,
	GetEntityByUrlRequestBody,
	GetEntityByUrlRequestQueryParameters,
	EntitiesRequestLocals
>;

export type GetEntityByUrlResponse = Response<
	GetEntityByUrlRequestResponseBody,
	EntitiesRequestLocals
>;

/*
 * The contract of the `onEntityAssociated` action.
 * See https://developer.atlassian.com/cloud/devops-provider-actions/specifications/current/#on-entity-associated
 */
export type OnEntityAssociatedRequestQueryParameters = {
	readonly userId?: string;
};

export type OnEntityAssociatedRequestBody = {
	readonly entity: {
		readonly ari: string;
		readonly id: string;
	};
	readonly associateWith: {
		readonly ati: string;
		readonly ari: string;
		readonly cloudId: string;
		readonly id: string;
	};
};

export type OnEntityAssociatedRequest = Request<
	Record<string, never>,
	void,
	OnEntityAssociatedRequestBody,
	OnEntityAssociatedRequestQueryParameters,
	EntitiesRequestLocals
>;

export type OnEntityAssociatedResponse = Response<void, EntitiesRequestLocals>;

/*
 * The contract of the `onEntityDisassociated` action.
 * See https://developer.atlassian.com/cloud/devops-provider-actions/specifications/current/#on-entity-disassociated
 */
export type OnEntityDisassociatedRequestQueryParameters = {
	readonly userId?: string;
};

export type OnEntityDisassociatedRequestBody = {
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

export type OnEntityDisassociatedRequest = Request<
	Record<string, never>,
	void,
	OnEntityDisassociatedRequestBody,
	OnEntityDisassociatedRequestQueryParameters,
	EntitiesRequestLocals
>;

export type OnEntityDisassociatedResponse = Response<
	void,
	EntitiesRequestLocals
>;
