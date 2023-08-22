import { ConnectInstallationCreateParams } from '../domain/entities/connect-installation';
import { ConnectInstallationRepository } from '../domain/repositories/connect-installation-repository';

export class InstalledUseCase {
	connectInstallationRepository: ConnectInstallationRepository;

	constructor(connectInstallationRepository: ConnectInstallationRepository) {
		this.connectInstallationRepository = connectInstallationRepository;
	}

	execute = async (installation: ConnectInstallationCreateParams) => {
		await this.connectInstallationRepository.upsertInstallation(installation);
	};
}
