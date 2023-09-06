import { Router } from 'express';
import type { NextFunction, Response } from 'express';

import type {
	AtlassianDesign,
	ConnectInstallation,
} from '../../../domain/entities';
import type { AssociateEntityUseCaseParams } from '../../../usecases';
import { associateEntityUseCase } from '../../../usecases';
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

entitiesRouter.post(
	'/associateEntity',
	authHeaderSymmetricJwtMiddleware,
	(
		req: TypedRequest<AssociateEntityRequestParams>,
		res: AssociateEntityResponse,
		next: NextFunction,
	) => {
		const atlassianUserId = req.headers['user-id'];
		if (!atlassianUserId || typeof atlassianUserId !== 'string') {
			const errorMessage = 'Missing or invalid User-Id header';
			res.status(401).send(errorMessage);
			return;
		}
		associateEntityUseCase
			.execute({
				...req.body,
				atlassianUserId,
				connectInstallation: res.locals.connectInstallation,
			})
			.then((design) => res.status(201).send({ design }))
			.catch((error) => next(error));
	},
);
