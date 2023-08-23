import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient;

export const getPrismaClient = () => {
	if (!prismaClient) {
		prismaClient = new PrismaClient();
	}
	return prismaClient;
};
