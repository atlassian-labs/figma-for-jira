import { figmaService } from '../infrastructure/figma';

export const check3loUseCase = {
	execute: async (atlassianUserId: string): Promise<boolean> => {
		return await figmaService.validateAuth(atlassianUserId);
	},
};
