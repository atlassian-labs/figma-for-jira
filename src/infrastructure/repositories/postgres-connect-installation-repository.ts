import { PrismaClient } from '@prisma/client';
import {
	ConnectInstallation,
	ConnectInstallationCreateParams,
} from 'src/domain/entities/connect-installation';
import { ConnectInstallationRepository } from 'src/domain/repositories/connect-installation-repository';
import logger from '../logger';

export class PostgresConnectInstallationRepository
	implements ConnectInstallationRepository
{
	prisma: PrismaClient;

	constructor(prismaClient: PrismaClient) {
		this.prisma = prismaClient;
	}

	getInstallation = async (key: string): Promise<ConnectInstallation> => {
		return await this.prisma.connectInstallation.findFirstOrThrow({
			where: { key },
		});
	};

	upsertInstallation = async (
		installation: ConnectInstallationCreateParams,
	) => {
		try {
			return await this.prisma.connectInstallation.upsert({
				create: installation,
				update: installation,
				where: { key: installation.key },
			});
		} catch (e: unknown) {
			logger.error(`Failed to upsert ${installation.key} ${e}`, e);
			throw e;
		}
	};
}
