import { Router } from 'express';
import type { NextFunction, Response } from 'express';

import type { ConnectInstallation } from '../../../domain/entities';
import type { AssociateEntityUseCaseParams } from '../../../usecases';
import { associateEntityUseCase } from '../../../usecases';
import { authHeaderSymmetricJwtMiddleware } from '../../middleware';
import type { TypedRequest } from '../types';

export const entitiesRouter = Router();

interface AssociateEntityResponse extends Response {
	locals: {
		connectInstallation?: ConnectInstallation;
	};
}

entitiesRouter.post(
	'/associateEntity',
	authHeaderSymmetricJwtMiddleware,
	(
		req: TypedRequest<AssociateEntityUseCaseParams>,
		res: AssociateEntityResponse,
		next: NextFunction,
	) => {
		const atlassianUserId = req.headers['user-id'];
		if (!atlassianUserId || typeof atlassianUserId !== 'string') {
			const errorMessage = 'Missing or invalid User-Id header';
			res.status(401).send(errorMessage);
			throw new Error(errorMessage);
		}
		associateEntityUseCase
			.execute({
				...req.body,
				atlassianUserId,
				// Non-null assertion is safe as `authHeaderSymmetricJwtMiddleware` will throw if `res.locals.connectInstallation` is undefined
				connectInstallation: res.locals.connectInstallation!,
			})
			.then((design) => res.status(201).send({ design }))
			.catch((error) => next(error));
	},
);
