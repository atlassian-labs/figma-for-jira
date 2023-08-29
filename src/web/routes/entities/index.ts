import { NextFunction, Router } from 'express';

import { associateEntityUseCase } from '../../../usecases';
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

// TODO: type the User-Context header
entitiesRouter.post(
	'/associateEntity',
	(req: TypedRequest<AssociateEntityPayload>, res, next: NextFunction) => {
		// TODO: Does this endpoint need JWT middleware?
		// TODO: Add utility to extract aaid from User-Context header. Fail if header or aaid not present.
		associateEntityUseCase
			.execute({ ...req.body, atlassianUserId: 'TODO' })
			// TODO: Response body should be Data Depot schema designs
			.then((authorized) => res.send({ authorized }))
			.catch((error) => next(error));
		res.sendStatus(204);
	},
);
