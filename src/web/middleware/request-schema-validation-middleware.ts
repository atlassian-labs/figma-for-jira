import type { NextFunction, Request, Response } from 'express';

import type { JSONSchemaTypeWithId } from '../../common/schema-validation';
import { validateSchema } from '../../common/schema-validation';
import { BadRequestResultError } from '../../usecases';

export const requestSchemaValidationMiddleware = <T>(
	schema: JSONSchemaTypeWithId<T>,
) =>
	function (req: Request, res: Response, next: NextFunction) {
		const bodyValidationResult = validateSchema(req, schema);

		if (!bodyValidationResult.valid) {
			const errorMessages =
				bodyValidationResult.errors
					?.map((e) => `${e.instancePath} - ${e.message}`)
					.join('\n') ?? 'Unknown';

			return next(new BadRequestResultError(`Bad request:\n${errorMessages}`));
		}

		next();
	};
