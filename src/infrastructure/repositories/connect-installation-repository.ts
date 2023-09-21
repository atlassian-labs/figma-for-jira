import type { ConnectInstallation as PrismaConnectInstallation } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaErrorCode } from './constants';
import { RepositoryRecordNotFoundError } from './errors';
import { prismaClient } from './prisma-client';

import type {
	ConnectInstallation,
	ConnectInstallationCreateParams,
} from '../../domain/entities';

export class ConnectInstallationRepository {
	get = async (id: number): Promise<ConnectInstallation> => {
		const result = await prismaClient.get().connectInstallation.findFirst({
			where: { id },
		});
		if (result === null) {
			throw new RepositoryRecordNotFoundError(
				`Failed to find ConnectInstallation for id ${id}`,
			);
		}
		return this.mapToDomainModel(result);
	};

	getByClientKey = async (clientKey: string): Promise<ConnectInstallation> => {
		const result = await prismaClient.get().connectInstallation.findFirst({
			where: { clientKey },
		});
		if (result === null) {
			throw new RepositoryRecordNotFoundError(
				`Failed to find ConnectInstallation for clientKey ${clientKey}`,
			);
		}
		return this.mapToDomainModel(result);
	};

	upsert = async (
		installation: ConnectInstallationCreateParams,
	): Promise<ConnectInstallation> => {
		const result = await prismaClient.get().connectInstallation.upsert({
			create: installation,
			update: installation,
			where: { clientKey: installation.clientKey },
		});
		return this.mapToDomainModel(result);
	};

	deleteByClientKey = async (
		clientKey: string,
	): Promise<ConnectInstallation> => {
		try {
			const result = await prismaClient.get().connectInstallation.delete({
				where: { clientKey },
			});
			return this.mapToDomainModel(result);
		} catch (e: unknown) {
			if (
				e instanceof PrismaClientKnownRequestError &&
				e.code === PrismaErrorCode.RecordNotFound
			) {
				throw new RepositoryRecordNotFoundError(e.message);
			}
			throw e;
		}
	};

	private mapToDomainModel = ({
		id,
		key,
		clientKey,
		sharedSecret,
		baseUrl,
		displayUrl,
	}: PrismaConnectInstallation): ConnectInstallation => ({
		id,
		key,
		clientKey,
		sharedSecret,
		baseUrl,
		displayUrl,
	});
}

export const connectInstallationRepository =
	new ConnectInstallationRepository();
