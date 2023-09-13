import { HttpStatusCode } from 'axios';
import { Router } from 'express';
import type { NextFunction } from 'express';

import type {
	AssociateEntityRequestParams,
	AssociateEntityResponse,
	DisassociateEntityRequestParams,
	DisassociateEntityResponse,
} from './types';

import {
	associateEntityUseCase,
	disassociateEntityUseCase,
} from '../../../usecases';
import { authHeaderSymmetricJwtMiddleware } from '../../middleware';
import type { TypedRequest } from '../types';

export class UnauthorizedError extends Error {}

const getUserIdHeaderOrThrow = (
	userId: string | string[] | undefined,
): string => {
	if (!userId || typeof userId !== 'string') {
		throw new UnauthorizedError('Missing or invalid User-Id header');
	}
	return userId;
};

export const entitiesRouter = Router();

entitiesRouter.post(
	'/associateEntity',
	authHeaderSymmetricJwtMiddleware,
	(
		req: TypedRequest<AssociateEntityRequestParams>,
		res: AssociateEntityResponse,
		next: NextFunction,
	) => {
		const atlassianUserId = getUserIdHeaderOrThrow(req.headers['user-id']);
		associateEntityUseCase
			.execute({
				...req.body,
				atlassianUserId,
				connectInstallation: res.locals.connectInstallation,
			})
			.then((design) => res.status(HttpStatusCode.Ok).send({ design }))
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
		const atlassianUserId = getUserIdHeaderOrThrow(req.headers['user-id']);
		disassociateEntityUseCase
			.execute({
				...req.body,
				atlassianUserId,
				connectInstallation: res.locals.connectInstallation,
			})
			.then((design) => res.status(HttpStatusCode.Ok).send({ design }))
			.catch((error) => next(error));
	},
);
