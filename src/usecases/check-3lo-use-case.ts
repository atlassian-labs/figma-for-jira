import { figmaService } from '../infrastructure/figma';

export const check3loUseCase = {
	execute: async (atlassianUserId: string): Promise<boolean> => {
		try {
			await figmaService.getValidCredentialsOrThrow(atlassianUserId);
			return true;
		} catch (e: unknown) {
			return false;
		}
	},
};
