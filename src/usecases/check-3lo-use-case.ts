import { figmaService } from '../infrastructure/figma';

export const check3loUseCase = {
	execute: async (atlassianUserId: string): Promise<boolean> => {
		const credentials = await figmaService.getValidCredentials(atlassianUserId);
		return credentials ? true : false;
	},
};
