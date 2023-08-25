import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient;

/**
 * @internal
 */
export const getPrismaClient = (): PrismaClient => {
	if (!prismaClient) {
		console.log('!!!!!!!!!CTZ TEST!!!!! What is my env??:', process.env);
		prismaClient = new PrismaClient();
	}
	return prismaClient;
};
