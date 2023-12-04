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

import { tryParseUrl } from '../../../common/url-utils';
import {
	associateDesignUseCase,
	disassociateDesignUseCase,
} from '../../../usecases';
import { backfillDesignUseCase } from '../../../usecases/backfill-design-use-case';
import { BadRequestResponseStatusError } from '../../errors';
import { requestSchemaValidationMiddleware } from '../../middleware';
import { jiraServerSymmetricJwtAuthMiddleware } from '../../middleware/jira';

export const entitiesRouter = Router();

entitiesRouter.use(jiraServerSymmetricJwtAuthMiddleware);

entitiesRouter.post(
	'/associateEntity',
	requestSchemaValidationMiddleware(ASSOCIATE_ENTITY_REQUEST_SCHEMA),
	(
		req: AssociateEntityRequest,
		res: AssociateEntityResponse,
		next: NextFunction,
	) => {
		const { connectInstallation } = res.locals;
		const atlassianUserId = req.query.userId;

		const designUrl = tryParseUrl(req.body.entity.url);

		if (!designUrl) {
			return next(new BadRequestResponseStatusError('Invalid design URL.'));
		}

		// Determine whether the design is being backfilled. The design is considered for backfill if it contains a
		// special query parameter (`com.atlassian.designs.backfill`).
		// Jira Frontend appends this query parameter to the design URL as a temporary workaround that allows to
		// distinguish "Backfill" from normal "Associate" operations. Therefore, the app can apply some special considerations
		// to designs for backfill (e.g., handle deleted designs).
		const isBackfill = designUrl.searchParams.has(
			'com.atlassian.designs.backfill',
			'true',
		);

		if (isBackfill) {
			backfillDesignUseCase
				.execute({
					designUrl,
					associateWith: req.body.associateWith,
					atlassianUserId,
					connectInstallation,
				})
				.then((design) => res.status(HttpStatusCode.Ok).send(design))
				.catch(next);
		} else {
			associateDesignUseCase
				.execute({
					designUrl,
					associateWith: req.body.associateWith,
					atlassianUserId,
					connectInstallation,
				})
				.then((design) => res.status(HttpStatusCode.Ok).send(design))
				.catch(next);
		}
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
		const { connectInstallation } = res.locals;
		const atlassianUserId = req.query.userId;

		disassociateDesignUseCase
			.execute({
				...req.body,
				atlassianUserId,
				connectInstallation,
			})
			.then((design) => res.status(HttpStatusCode.Ok).send(design))
			.catch(next);
	},
);
