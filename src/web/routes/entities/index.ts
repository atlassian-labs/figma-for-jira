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

entitiesRouter.post(
	'/associateEntity',
	(req: TypedRequest<AssociateEntityPayload>, res, next: NextFunction) => {
		// TODO: Add JWT middleware
		// TODO: Determine how we'll get the Atlassian Account ID. Fail if unable to retrieve this.
		// const userContextToken = req.get('User-Context');
		// if (!userContextToken) {
		// 	const missingUserContextTokenMessage =
		// 		'Request missing User-Context header';
		// 	getLogger().error(missingUserContextTokenMessage);
		// 	res.status(400).send(missingUserContextTokenMessage);
		// 	return;
		// }
		associateEntityUseCase
			.execute({ ...req.body, atlassianUserId: '61422f9dff23ba0071782bb7' })
			// TODO: Response body should be Data Depot schema designs
			.then((authorized) => res.send({ authorized }))
			.catch((error) => next(error));
		res.sendStatus(204);
	},
);
