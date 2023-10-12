import { HttpStatusCode } from 'axios';
import type { NextFunction } from 'express';
import { Router } from 'express';

import {
	ASSOCIATE_ENTITY_REQUEST_BODY_SCHEMA,
	DISASSOCIATE_ENTITY_REQUEST_BODY_SCHEMA,
} from './schemas';
import type {
	AssociateEntityRequest,
	AssociateEntityResponse,
	DisassociateEntityRequest,
	DisassociateEntityResponse,
} from './types';

import { assertSchema } from '../../../infrastructure';
import {
	associateEntityUseCase,
	disassociateEntityUseCase,
} from '../../../usecases';
import {
	extractUserIdFromHeadersMiddleware,
	jiraServerSymmetricJwtAuthMiddleware,
} from '../../middleware/jira';

export const entitiesRouter = Router();

entitiesRouter.use(
	extractUserIdFromHeadersMiddleware,
	jiraServerSymmetricJwtAuthMiddleware,
);

entitiesRouter.post(
	'/associateEntity',
	(
		req: AssociateEntityRequest,
		res: AssociateEntityResponse,
		next: NextFunction,
	) => {
		assertSchema(req.body, ASSOCIATE_ENTITY_REQUEST_BODY_SCHEMA);
		const { connectInstallation, atlassianUserId } = res.locals;
		associateEntityUseCase
			.execute({
				...req.body,
				atlassianUserId,
				connectInstallation,
			})
			.then((design) => res.status(HttpStatusCode.Ok).send(design))
			.catch((error) => next(error));
	},
);

entitiesRouter.post(
	'/disassociateEntity',
	(
		req: DisassociateEntityRequest,
		res: DisassociateEntityResponse,
		next: NextFunction,
	) => {
		assertSchema(req.body, DISASSOCIATE_ENTITY_REQUEST_BODY_SCHEMA);
		const { connectInstallation, atlassianUserId } = res.locals;
		disassociateEntityUseCase
			.execute({
				...req.body,
				atlassianUserId,
				connectInstallation,
			})
			.then((design) => res.status(HttpStatusCode.Ok).send(design))
			.catch((error) => next(error));
	},
);
