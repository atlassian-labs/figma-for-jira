import type { Request, Response } from 'express';

import type {
	AtlassianDesign,
	ConnectInstallation,
} from '../../../domain/entities';
import type {
	AssociateEntityUseCaseParams,
	DisassociateEntityUseCaseParams,
} from '../../../usecases';

export type EntitiesResponseBody = { design: AtlassianDesign } | string;

export type EntitiesRequestLocals = {
	connectInstallation: ConnectInstallation;
	atlassianUserId: string;
};

export type AssociateEntityRequestBody = Omit<
	AssociateEntityUseCaseParams,
	'atlassianUserId' | 'connectInstallation'
>;

export type AssociateEntityRequest = Request<
	Record<string, never>,
	EntitiesResponseBody,
	AssociateEntityRequestBody,
	Record<string, never>,
	EntitiesRequestLocals
>;

export type AssociateEntityResponse = Response<
	{ design: AtlassianDesign } | string,
	EntitiesRequestLocals
>;

export type DisassociateEntityRequestBody = Omit<
	DisassociateEntityUseCaseParams,
	'atlassianUserId' | 'connectInstallation'
>;

export type DisassociateEntityRequest = Request<
	Record<string, never>,
	EntitiesResponseBody,
	DisassociateEntityRequestBody,
	Record<string, never>,
	EntitiesRequestLocals
>;

export type DisassociateEntityResponse = Response<
	EntitiesResponseBody,
	EntitiesRequestLocals
>;
