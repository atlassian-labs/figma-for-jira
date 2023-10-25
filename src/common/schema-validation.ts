import type { ErrorObject, JSONSchemaType, ValidateFunction } from 'ajv';
import Ajv from 'ajv';

import { CauseAwareError } from './errors';
import { isString } from './string-utils';

const schemaValidation = new Ajv({ allowUnionTypes: true });

/**
 * Returns the schema defined with Ajv.
 *
 * The function makes sure that the schema is compiled only once and cached, so a cached schema is returned on a subsequent call.
 *
 * @see https://ajv.js.org/guide/managing-schemas.html#pre-adding-all-schemas-vs-adding-on-demand
 */
const getAjvSchema = <T>(
	schema: JSONSchemaTypeWithId<T>,
): ValidateFunction<T> => {
	return (
		schemaValidation.getSchema(schema.$id) ?? schemaValidation.compile(schema)
	);
};

export type JSONSchemaTypeWithId<T> = JSONSchemaType<T> & { $id: string };

export function validateSchema<T>(
	value: unknown,
	schema: JSONSchemaTypeWithId<T>,
): { valid: boolean; errors?: ErrorObject<string, unknown>[] } {
	const validate = getAjvSchema(schema);

	if (!validate(value)) {
		return { valid: false, errors: validate.errors ?? undefined };
	}

	return { valid: true };
}

export function assertSchema<T>(
	value: unknown,
	schema: JSONSchemaTypeWithId<T>,
): asserts value is T {
	const { valid, errors } = validateSchema(value, schema);

	if (!valid) {
		throw new SchemaValidationError(
			`Error validating schema ${schema.$id}`,
			errors,
		);
	}
}

export function parseJsonOfSchema<T>(
	value: unknown,
	schema: JSONSchemaTypeWithId<T>,
): T {
	if (isString(value)) {
		try {
			value = JSON.parse(value);
		} catch (e) {
			throw new SchemaValidationError('Invalid JSON.');
		}
	}
	assertSchema(value, schema);
	return value;
}

export class SchemaValidationError extends CauseAwareError {}
