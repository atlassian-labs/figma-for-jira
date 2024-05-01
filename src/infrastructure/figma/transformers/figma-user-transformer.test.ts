import { transformFigmaUserToAtlassianProviderUser } from './figma-user-transformer';

import type { FigmaUser } from '../../../domain/entities';

describe('transformFigmaUserToAtlassianProviderUser', () => {
	it('should correctly transform a Figma user to Atlassian provider user', () => {
		const figmaUser: FigmaUser = {
			id: 'test-id',
			email: 'email@example.com',
		};

		const result = transformFigmaUserToAtlassianProviderUser({ figmaUser });

		expect(result).toStrictEqual({
			id: figmaUser.id,
		});
	});
});
