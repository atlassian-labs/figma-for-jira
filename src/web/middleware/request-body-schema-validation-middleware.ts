import type { NextFunction, Request, Response } from 'express';

import type { JSONSchemaTypeWithId } from '../../infrastructure';
import { validateSchema } from '../../infrastructure';
import { BadRequestResultError } from '../../usecases';

export const requestBodySchemaValidationMiddleware = <T>(
	schema: JSONSchemaTypeWithId<T>,
) =>
	function (req: Request, res: Response, next: NextFunction) {
		const { valid, errors } = validateSchema(req.body, schema);

		if (!valid) {
			const errorMessages =
				errors?.map((e) => e.message).join('\n') ?? 'Unknown';

			return next(
				new BadRequestResultError(`Invalid request body: ${errorMessages}`),
			);
		}

		next();
	};
