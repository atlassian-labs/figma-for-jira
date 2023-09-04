import { decodeSymmetric, SymmetricAlgorithm } from 'atlassian-jwt';
import { createQueryStringHash } from 'atlassian-jwt/dist/lib/jwt';

import { createJwtToken } from './jwt-utils';
import { MOCK_JWT_TOKEN_PARAMS } from './testing';

import { Duration } from '../../../common/duration';

describe('createJwtToken', () => {
	beforeAll(() => {
		jest.useFakeTimers();
	});

	afterAll(() => {
		jest.useRealTimers();
	});

	test('should create a symmetric JWT token', () => {
		jest.setSystemTime(new Date('2023-09-01T03:00:00Z'));

		const result = createJwtToken({
			request: {
				method: 'GET',
				pathname: '/rest/agile/1.0/issue/1',
				query: {
					param1: 'test',
				},
			},
			connectAppKey: 'TEST_APP_KEY',
			connectSharedSecret: 'TEST_CONNECT_SECRET',
			expiresIn: Duration.ofMinutes(10),
		});

		expect(result).toBe(
			'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE2OTM1MzcyMDAsImV4cCI6MTY5MzUzNzgwMCwiaXNzIjoiVEVTVF9BUFBfS0VZIiwicXNoIjoiOWFlYjc5NWFiOWNiZmQ5NDFiMDIxNDcxMWZhM2I4OTNhOGY0NzE3OWRjZGRmZWJiM2JlM2NjODEwYmVlNGU3NiJ9.A_rR8_WZBLHOyM7VsEB7N-fheA5mE5ax_OfPfJMLS1c',
		);
	});

	test('should create a JWT token that can be successfully decoded', () => {
		const now = Date.now();
		jest.setSystemTime(now);

		const result = createJwtToken(MOCK_JWT_TOKEN_PARAMS);

		const decodedToken = decodeSymmetric(
			result,
			MOCK_JWT_TOKEN_PARAMS.connectSharedSecret,
			SymmetricAlgorithm.HS256,
		);
		expect(decodedToken).toEqual({
			iat: Math.floor(now / 1000),
			exp: Math.floor(now / 1000) + MOCK_JWT_TOKEN_PARAMS.expiresIn.asSeconds,
			iss: MOCK_JWT_TOKEN_PARAMS.connectAppKey,
			qsh: createQueryStringHash(MOCK_JWT_TOKEN_PARAMS.request),
		});
	});
});
