import type { NextFunction, Request, Response } from 'express';

import type { JSONSchemaTypeWithId } from '../../infrastructure';
import { validateSchema } from '../../infrastructure';
import { BadRequestResultError } from '../../usecases';

export const requestQuerySchemaValidationMiddleware = <T>(
	schema: JSONSchemaTypeWithId<T>,
) =>
	function (req: Request, res: Response, next: NextFunction) {
		const { valid, errors } = validateSchema(req.query, schema);

		if (valid) {
			const errorMessages =
				errors?.map((e) => e.message).join('\n') ?? 'Unknown';

			return next(
				new BadRequestResultError(`Invalid query parameters: ${errorMessages}`),
			);
		}

		next();
	};
