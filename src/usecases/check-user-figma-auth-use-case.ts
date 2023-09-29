import type { ConnectInstallation } from '../domain/entities';
import {
	figmaService,
	FigmaServiceCredentialsError,
} from '../infrastructure/figma';

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
