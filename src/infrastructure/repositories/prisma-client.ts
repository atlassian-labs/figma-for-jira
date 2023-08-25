import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient;

/**
 * @internal
 */
export const getPrismaClient = (): PrismaClient => {
	if (!prismaClient) {
		prismaClient = new PrismaClient();
	}
	return prismaClient;
};
