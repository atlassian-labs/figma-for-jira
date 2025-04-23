import { HttpStatusCode } from 'axios';
import type { NextFunction } from 'express';
import { Router } from 'express';

import {
	GET_ENTITY_BY_URL_REQUEST_SCHEMA,
	ON_ENTITY_ASSOCIATED_REQUEST_SCHEMA,
	ON_ENTITY_DISASSOCIATED_REQUEST_SCHEMA,
} from './schemas';
import type {
	GetEntityByUrlRequest,
	GetEntityByUrlResponse,
	OnEntityAssociatedRequest,
	OnEntityAssociatedResponse,
	OnEntityDisassociatedRequest,
	OnEntityDisassociatedResponse,
} from './types';

import { tryParseUrl } from '../../../common/url-utils';
import {
	getDesignByUrlUseCase,
	onDesignAssociatedWithIssueUseCaseParams,
	onDesignDisassociatedFromIssueUseCase,
} from '../../../usecases';
import { BadRequestResponseStatusError } from '../../errors';
import { requestSchemaValidationMiddleware } from '../../middleware';
import { jiraServerToServerSymmetricJwtAuthenticationMiddleware } from '../../middleware/jira';

export const entitiesRouterV2 = Router();

entitiesRouterV2.use(jiraServerToServerSymmetricJwtAuthenticationMiddleware);

/**
 * Returns Figma design details for the given URL.
 * Invoked when a Design is being associated with a Jira Issue.
 */
entitiesRouterV2.post(
	'/getEntityByUrl',
	requestSchemaValidationMiddleware(GET_ENTITY_BY_URL_REQUEST_SCHEMA),
	(
		req: GetEntityByUrlRequest,
		res: GetEntityByUrlResponse,
		next: NextFunction,
	) => {
		const { connectInstallation } = res.locals;
		const atlassianUserId = req.body.user.id;

		const designUrl = tryParseUrl(req.body.entity.url);

		if (!designUrl) {
			return next(new BadRequestResponseStatusError('Invalid design URL.'));
		}

		getDesignByUrlUseCase
			.execute({
				designUrl,
				atlassianUserId,
				connectInstallation,
			})
			.then((design) => res.status(HttpStatusCode.Ok).send(design))
			.catch(next);
	},
);

/**
 * Handles an event indicating that an entity (Design) has been associated with a Jira Issue.
 */
entitiesRouterV2.put(
	'/onEntityAssociated',
	requestSchemaValidationMiddleware(ON_ENTITY_ASSOCIATED_REQUEST_SCHEMA),
	(
		req: OnEntityAssociatedRequest,
		res: OnEntityAssociatedResponse,
		next: NextFunction,
	) => {
		const { connectInstallation } = res.locals;
		const atlassianUserId = req.body.user?.id;

		onDesignAssociatedWithIssueUseCaseParams
			.execute({
				design: req.body.entity,
				issue: req.body.associatedWith,
				atlassianUserId,
				connectInstallation,
			})
			.then(() => res.status(HttpStatusCode.Ok).send())
			.catch(next);
	},
);

/**
 * Handles an event indicating that an entity (Design) has been disassociated from a Jira Issue.
 */
entitiesRouterV2.put(
	'/onEntityDisassociated',
	requestSchemaValidationMiddleware(ON_ENTITY_DISASSOCIATED_REQUEST_SCHEMA),
	(
		req: OnEntityDisassociatedRequest,
		res: OnEntityDisassociatedResponse,
		next: NextFunction,
	) => {
		const { connectInstallation } = res.locals;
		const atlassianUserId = req.body.user?.id;

		onDesignDisassociatedFromIssueUseCase
			.execute({
				design: req.body.entity,
				issue: req.body.disassociatedFrom,
				atlassianUserId,
				connectInstallation,
			})
			.then(() => res.status(HttpStatusCode.Ok).send())
			.catch(next);
	},
);
