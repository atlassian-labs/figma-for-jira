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
 * See https://developer.atlassian.com/cloud/devops-provider-actions/specification_v2/get-entity-by-url/
 */
export type GetEntityByUrlRequestBody = {
	readonly entity: {
		readonly url: string;
	};
	readonly user: {
		readonly id: string;
	};
};

export type GetEntityByUrlRequestResponseBody = AtlassianDesign;

export type GetEntityByUrlRequest = Request<
	Record<string, never>,
	GetEntityByUrlRequestResponseBody,
	GetEntityByUrlRequestBody,
	Record<string, never>,
	EntitiesRequestLocals
>;

export type GetEntityByUrlResponse = Response<
	GetEntityByUrlRequestResponseBody,
	EntitiesRequestLocals
>;

/*
 * The contract of the `onEntityAssociated` action.
 * See https://developer.atlassian.com/cloud/devops-provider-actions/specification_v2/on-entity-associated/
 */
export type OnEntityAssociatedRequestBody = {
	readonly entity: {
		readonly ari: string;
		readonly id: string;
	};
	readonly associatedWith: {
		readonly ati: string;
		readonly ari: string;
		readonly cloudId: string;
		readonly id: string;
	};
	readonly user: {
		readonly id?: string;
	};
};

export type OnEntityAssociatedRequest = Request<
	Record<string, never>,
	void,
	OnEntityAssociatedRequestBody,
	Record<string, never>,
	EntitiesRequestLocals
>;

export type OnEntityAssociatedResponse = Response<void, EntitiesRequestLocals>;

/*
 * The contract of the `onEntityDisassociated` action.
 * See https://developer.atlassian.com/cloud/devops-provider-actions/specification_v2/on-entity-disassociated/
 */
export type OnEntityDisassociatedRequestBody = {
	readonly entity: {
		readonly ari: string;
		readonly id: string;
	};
	readonly disassociatedFrom: {
		readonly ati: string;
		readonly ari: string;
		readonly cloudId: string;
		readonly id: string;
	};
	readonly user: {
		readonly id?: string;
	};
};

export type OnEntityDisassociatedRequest = Request<
	Record<string, never>,
	void,
	OnEntityDisassociatedRequestBody,
	Record<string, never>,
	EntitiesRequestLocals
>;

export type OnEntityDisassociatedResponse = Response<
	void,
	EntitiesRequestLocals
>;
