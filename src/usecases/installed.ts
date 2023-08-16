import { ConnectInstallation } from "src/domain/entities/connect-installations";
import { ConnectInstallationRepository } from "src/domain/repositories/connect-installation-repository";

export const installedUseCase = (
	repository: ConnectInstallationRepository,
	installation: ConnectInstallation,
) => {
	console.log("installedUseCase", installation);
	repository.upsertInstallation(installation);
};
