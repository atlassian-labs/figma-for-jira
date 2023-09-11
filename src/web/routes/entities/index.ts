import { HttpStatusCode } from 'axios';
import { Router } from 'express';
import type { NextFunction, Response } from 'express';

import type {
	AtlassianDesign,
	ConnectInstallation,
} from '../../../domain/entities';
import type {
	AssociateEntityUseCaseParams,
	DisassociateEntityUseCaseParams,
} from '../../../usecases';
import {
	associateEntityUseCase,
	disassociateEntityUseCase,
} from '../../../usecases';
import { authHeaderSymmetricJwtMiddleware } from '../../middleware';
import type { TypedRequest } from '../types';

export const entitiesRouter = Router();

export type AssociateEntityRequestParams = Omit<
	AssociateEntityUseCaseParams,
	'atlassianUserId' | 'connectInstallation'
>;

type AssociateEntityResponse = Response<
	{ design: AtlassianDesign } | string,
	{ connectInstallation: ConnectInstallation }
>;

export type DisassociateEntityRequestParams = Omit<
	DisassociateEntityUseCaseParams,
	'atlassianUserId' | 'connectInstallation'
>;

type DisassociateEntityResponse = Response<
	{ design: AtlassianDesign } | string,
	{ connectInstallation: ConnectInstallation }
>;

const getUserIdHeaderOrThrow = (
	userId: string | string[] | undefined,
	res: Response,
): string => {
	if (!userId || typeof userId !== 'string') {
		const errorMessage = 'Missing or invalid User-Id header';
		res.status(401).send(errorMessage);
		throw errorMessage;
	}
	return userId;
};

entitiesRouter.post(
	'/associateEntity',
	authHeaderSymmetricJwtMiddleware,
	(
		req: TypedRequest<AssociateEntityRequestParams>,
		res: AssociateEntityResponse,
		next: NextFunction,
	) => {
		const atlassianUserId = getUserIdHeaderOrThrow(req.headers['user-id'], res);
		associateEntityUseCase
			.execute({
				...req.body,
				atlassianUserId,
				connectInstallation: res.locals.connectInstallation,
			})
			.then((design) => res.status(HttpStatusCode.Created).send({ design }))
			.catch((error) => next(error));
	},
);

entitiesRouter.post(
	'/disassociateEntity',
	authHeaderSymmetricJwtMiddleware,
	(
		req: TypedRequest<DisassociateEntityRequestParams>,
		res: DisassociateEntityResponse,
		next: NextFunction,
	) => {
		const atlassianUserId = getUserIdHeaderOrThrow(req.headers['user-id'], res);
		disassociateEntityUseCase
			.execute({
				...req.body,
				atlassianUserId,
				connectInstallation: res.locals.connectInstallation,
			})
			.then((design) => res.status(HttpStatusCode.Created).send({ design }))
			.catch((error) => next(error));
	},
);
