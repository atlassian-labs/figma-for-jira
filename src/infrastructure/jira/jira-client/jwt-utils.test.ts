import { decodeSymmetric, SymmetricAlgorithm } from 'atlassian-jwt';
import { createQueryStringHash } from 'atlassian-jwt/dist/lib/jwt';

import { createJwtToken } from './jwt-utils';
import { MOCK_JWT_TOKEN_PARAMS } from './testing';

describe('createJwtToken', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
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
			iss: MOCK_JWT_TOKEN_PARAMS.connectClientKey,
			qsh: createQueryStringHash(MOCK_JWT_TOKEN_PARAMS.request),
		});
	});
});
