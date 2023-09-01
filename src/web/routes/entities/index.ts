import { NextFunction, Router } from 'express';

import {
	associateEntityUseCase,
	AssociateEntityUseCaseParams,
} from '../../../usecases';
import { authHeaderSymmetricJwtMiddleware } from '../../middleware';
import type { TypedRequest } from '../types';

export const entitiesRouter = Router();

entitiesRouter.post(
	'/associateEntity',
	authHeaderSymmetricJwtMiddleware,
	(
		req: TypedRequest<AssociateEntityUseCaseParams>,
		res,
		next: NextFunction,
	) => {
		const atlassianUserId = req.headers['user-id'];
		if (!atlassianUserId || typeof atlassianUserId !== 'string') {
			res.status(401).send('Missing or invalid User-Id header');
			return;
		}
		associateEntityUseCase
			.execute({ ...req.body, atlassianUserId })
			.then((design) => res.status(201).send({ design }))
			.catch((error) => next(error));
	},
);
