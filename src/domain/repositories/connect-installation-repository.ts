import {
	ConnectInstallation,
	ConnectInstallationCreateParams,
} from '../entities/connect-installation';

export interface ConnectInstallationRepository {
	getInstallation: (key: string) => Promise<ConnectInstallation>;
	upsertInstallation: (
		installation: ConnectInstallationCreateParams,
	) => Promise<ConnectInstallation>;
}
