import type { Response } from 'express';

import type {
	AtlassianDesign,
	ConnectInstallation,
} from '../../../domain/entities';
import type {
	AssociateEntityUseCaseParams,
	DisassociateEntityUseCaseParams,
} from '../../../usecases';

export type AssociateEntityRequestParams = Omit<
	AssociateEntityUseCaseParams,
	'atlassianUserId' | 'connectInstallation'
>;

export type AssociateEntityResponse = Response<
	{ design: AtlassianDesign } | string,
	{ connectInstallation: ConnectInstallation }
>;

export type DisassociateEntityRequestParams = Omit<
	DisassociateEntityUseCaseParams,
	'atlassianUserId' | 'connectInstallation'
>;

export type DisassociateEntityResponse = Response<
	{ design: AtlassianDesign } | string,
	{ connectInstallation: ConnectInstallation }
>;
