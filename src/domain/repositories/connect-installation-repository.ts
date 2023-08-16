import { ConnectInstallation } from "../entities/connect-installations";

export interface ConnectInstallationRepository {
	getInstallation: (key: string) => void;
	upsertInstallation: (installation: ConnectInstallation) => void;
}
