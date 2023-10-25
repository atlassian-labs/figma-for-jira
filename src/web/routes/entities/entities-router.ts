import { HttpStatusCode } from 'axios';
import type { NextFunction } from 'express';
import { Router } from 'express';

import {
	ASSOCIATE_ENTITY_REQUEST_SCHEMA,
	DISASSOCIATE_ENTITY_REQUEST_SCHEMA,
} from './schemas';
import type {
	AssociateEntityRequest,
	AssociateEntityResponse,
	DisassociateEntityRequest,
	DisassociateEntityResponse,
} from './types';

import {
	associateEntityUseCase,
	disassociateEntityUseCase,
} from '../../../usecases';
import { requestSchemaValidationMiddleware } from '../../middleware';
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
	requestSchemaValidationMiddleware(ASSOCIATE_ENTITY_REQUEST_SCHEMA),
	(
		req: AssociateEntityRequest,
		res: AssociateEntityResponse,
		next: NextFunction,
	) => {
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
	requestSchemaValidationMiddleware(DISASSOCIATE_ENTITY_REQUEST_SCHEMA),
	(
		req: DisassociateEntityRequest,
		res: DisassociateEntityResponse,
		next: NextFunction,
	) => {
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
