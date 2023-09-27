import {
	figmaService,
	FigmaServiceCredentialsError,
} from '../infrastructure/figma';
import { ConnectInstallation } from '../domain/entities';

export const checkUserFigmaAuthUseCase = {
	execute: async (
		atlassianUserId: string,
		connectInstallation: ConnectInstallation,
	): Promise<boolean> => {
		try {
			await figmaService.getValidCredentialsOrThrow({
				atlassianUserId,
				connectInstallationId: connectInstallation.id,
			});
			return true;
		} catch (e: unknown) {
			if (e instanceof FigmaServiceCredentialsError) {
				return false;
			}

			throw e;
		}
	},
};
