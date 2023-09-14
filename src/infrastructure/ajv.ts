import Ajv from 'ajv';
import type { ErrorObject, JSONSchemaType, ValidateFunction } from 'ajv';

export const ajv = new Ajv();

export type JSONSchemaTypeWithId<T> = JSONSchemaType<T> & { $id: string };

/**
 * Returns the schema defined with Ajv.
 *
 * The function makes sure that the schema is compiled only once and cached, so a cached schema is returned on a subsequent call.
 *
 * @see https://ajv.js.org/guide/managing-schemas.html#pre-adding-all-schemas-vs-adding-on-demand
 */
export const getAjvSchema = <T>(
	schema: JSONSchemaTypeWithId<T>,
): ValidateFunction<T> => {
	return ajv.getSchema(schema.$id) ?? ajv.compile(schema);
};

export function assertSchema<T>(
	value: unknown,
	schema: JSONSchemaTypeWithId<T>,
): asserts value is T {
	const validate = getAjvSchema(schema);

	if (!validate(value)) {
		throw new SchemaValidationError(
			`Error validating schema ${schema.$id}`,
			validate.errors,
		);
	}
}

export class SchemaValidationError extends Error {
	errors?: ErrorObject[] | null;

	constructor(message: string, errors?: ErrorObject[] | null) {
		super(message);
		this.errors = errors;
	}
}
