import type {
	JSONSchemaType as AjvJSONSchemaType,
	ErrorObject,
	ValidateFunction,
} from 'ajv';
import Ajv from 'ajv';

import { CauseAwareError } from './errors';
import { isString } from './string-utils';

const ajv = new Ajv({ allowUnionTypes: true, discriminator: true });

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
	return ajv.getSchema(schema.$id) ?? ajv.compile(schema);
};

export type JSONSchemaType<T> = AjvJSONSchemaType<T>;

export type JSONSchemaTypeWithId<T> = JSONSchemaType<T> & {
	readonly $id: string;
};

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

/**
 * @throws {SchemaValidationError} The given value is not of the expected schema.
 */
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

/**
 * @throws {SchemaValidationError} The given value is not of the expected schema.
 */
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
