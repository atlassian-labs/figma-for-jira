import {
	ConnectInstallation,
	ConnectInstallationCreateParams,
} from 'src/domain/entities/connect-installations';
import { ConnectInstallationRepository } from '../domain/repositories/connect-installation-repository';
import logger from '../infrastructure/logger';

export const installedUseCase = async (
	repository: ConnectInstallationRepository,
	installation: ConnectInstallationCreateParams,
) => {
	await repository.upsertInstallation(installation);
};
