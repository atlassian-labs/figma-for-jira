import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { requestSchemaValidationMiddleware } from './request-schema-validation-middleware';

import type { JSONSchemaTypeWithId } from '../../common/schema-validation';
import { ResponseStatusError } from '../errors';

type TestRequest = {
	readonly query: {
		t: number;
	};
	readonly body: {
		id: string;
	};
};

const TEST_REQUEST_SCHEMA: JSONSchemaTypeWithId<TestRequest> = {
	$id: 'figma-for-jira:test-request-schema',
	type: 'object',
	properties: {
		query: {
			type: 'object',
			properties: {
				t: {
					type: 'integer',
				},
			},
			required: ['t'],
		},
		body: {
			type: 'object',
			properties: {
				id: {
					type: 'string',
				},
			},
			required: ['id'],
		},
	},
	required: ['query', 'body'],
};

describe('requestSchemaValidationMiddleware', () => {
	it('should pass control to the next middleware if request is valid', () => {
		const request = {
			query: {
				t: Date.now(),
			},
			body: {
				id: uuidv4(),
			},
		} as unknown as Request;
		const next = jest.fn();

		requestSchemaValidationMiddleware(TEST_REQUEST_SCHEMA)(
			request,
			{} as Response,
			next,
		);

		expect(next).toHaveBeenCalledWith();
	});

	it('should pass error to the next middleware request is invalid', () => {
		const request = {
			query: {
				t: new Date().toISOString(),
			},
			body: {
				id: 1,
			},
		} as unknown as Request;
		const next = jest.fn();

		requestSchemaValidationMiddleware(TEST_REQUEST_SCHEMA)(
			request,
			{} as Response,
			next,
		);

		expect(next).toHaveBeenCalledWith(expect.any(ResponseStatusError));
	});
});
