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
	getDesignByUrlForBackfillUseCase,
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
		const atlassianUserId = req.query.userId;

		const designUrl = tryParseUrl(req.body.entity.url);

		if (!designUrl) {
			return next(new BadRequestResponseStatusError('Invalid design URL.'));
		}

		// TODO: The backfill implementation is temporary. Delete it once it is deprecated.
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
			getDesignByUrlForBackfillUseCase
				.execute({
					designUrl,
					atlassianUserId,
					connectInstallation,
				})
				.then((design) => res.status(HttpStatusCode.Ok).send(design))
				.catch(next);
		} else {
			getDesignByUrlUseCase
				.execute({
					designUrl,
					atlassianUserId,
					connectInstallation,
				})
				.then((design) => res.status(HttpStatusCode.Ok).send(design))
				.catch(next);
		}
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
		const atlassianUserId = req.query.userId;

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
		const atlassianUserId = req.query.userId;

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
