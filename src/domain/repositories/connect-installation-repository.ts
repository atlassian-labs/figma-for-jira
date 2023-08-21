import {
	ConnectInstallation,
	ConnectInstallationCreateParams,
} from '../entities/connect-installations';

export interface ConnectInstallationRepository {
	getInstallation: (key: string) => Promise<ConnectInstallation>;
	upsertInstallation: (
		installation: ConnectInstallationCreateParams,
	) => Promise<ConnectInstallation>;
}
