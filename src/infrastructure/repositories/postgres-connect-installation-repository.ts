import { ConnectInstallation } from 'src/domain/entities/connect-installations';
import { ConnectInstallationRepository } from 'src/domain/repositories/connect-installation-repository';

class PostgresConnectInstallationRepository
	implements ConnectInstallationRepository
{
	getInstallation = (key: string) => {
		console.log('get install');
	};

	upsertInstallation = (installation: ConnectInstallation) => {
		console.log('upsert install');
	};
}

export default new PostgresConnectInstallationRepository();
