import type { NextFunction, Request, Response } from 'express';

import type { JSONSchemaTypeWithId } from '../../common/schema-validation';
import { validateSchema } from '../../common/schema-validation';
import { BadRequestResponseStatusError } from '../errors';

/**
 * Validates the request (e.g., query or body) to match the given schema. If the request is invalid,
 * pass `BadRequestResponseStatusError` to the Express pipeline, which wil result in HTTP 400.
 */
export const requestSchemaValidationMiddleware = <T>(
	schema: JSONSchemaTypeWithId<T>,
) =>
	function (req: Request, res: Response, next: NextFunction) {
		const bodyValidationResult = validateSchema(req, schema);

		if (!bodyValidationResult.valid) {
			const errorMessages =
				bodyValidationResult.errors
					?.map((e) => `${e.instancePath} ${e.message}`)
					.join('\n') ?? 'Unknown';

			next(new BadRequestResponseStatusError(`Invalid request`, errorMessages));
		}

		next();
	};
