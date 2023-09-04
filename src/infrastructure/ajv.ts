import type { JSONSchemaType, ValidateFunction } from 'ajv';
import Ajv from 'ajv';

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
