import type { NextFunction, Request, Response } from 'express';

import type { JSONSchemaTypeWithId } from '../../common/schema-validation';
import { validateSchema } from '../../common/schema-validation';
import { BadRequestResponseStatusError } from '../errors';

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
