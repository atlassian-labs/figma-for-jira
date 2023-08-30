import { NextFunction, Router } from 'express';

import { associateEntityUseCase } from '../../../usecases';
import { authHeaderAsymmetricJwtMiddleware } from '../../middleware';
import type { TypedRequest } from '../types';

type Entity = {
	readonly url: string;
};

export type AssociateWith = {
	readonly ari: string;
};

export type AssociateEntityPayload = {
	readonly cloudId: string;
	readonly entity: Entity;
	readonly associateWith: AssociateWith;
};

export const entitiesRouter = Router();

entitiesRouter.post(
	'/associateEntity',
	(req: TypedRequest<AssociateEntityPayload>, res, next) => {
		authHeaderAsymmetricJwtMiddleware(req, res, next).then(next).catch(next);
	},
	(req: TypedRequest<AssociateEntityPayload>, res, next: NextFunction) => {
		const atlassianUserId = req.headers['User-Context'];
		if (!atlassianUserId || typeof atlassianUserId !== 'string') {
			res.status(500).send('Missing or invalid User-Context header');
			return;
		}
		associateEntityUseCase
			.execute({ ...req.body, atlassianUserId })
			// TODO: Response body should be Data Depot schema designs
			.then((authorized) => res.send({ authorized }))
			.catch((error) => next(error));
		res.sendStatus(204);
	},
);
