import type { Request, Response } from 'express';

import type {
	AtlassianDesign,
	ConnectInstallation,
} from '../../../domain/entities';
import type {
	AssociateEntityUseCaseParams,
	DisassociateEntityUseCaseParams,
} from '../../../usecases';

export type EntitiesResponseBody = AtlassianDesign | string;

export type EntitiesRequestLocals = {
	readonly connectInstallation: ConnectInstallation;
	readonly atlassianUserId: string;
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
	EntitiesResponseBody,
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
