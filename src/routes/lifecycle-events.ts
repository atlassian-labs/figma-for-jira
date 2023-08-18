import { Request, Router } from 'express';
import {
	authHeaderAsymmetricJwtMiddleware,
	authHeaderSymmetricJwtMiddleware,
} from '../middlewares/auth-header-jwt-middleware';
import { ConnectInstallation } from '../domain/entities/connect-installations';
import { installedUseCase } from '../usecases/installed';
import postgresConnectInstallationRepository from '../infrastructure/repositories/postgres-connect-installation-repository';

export const lifecycleEventsRouter = Router();

interface TypedRequest<T> extends Request {
	body: T;
}

lifecycleEventsRouter.post(
	'/installed',
	authHeaderAsymmetricJwtMiddleware,
	async (req: TypedRequest<ConnectInstallation>, res) => {
		installedUseCase(postgresConnectInstallationRepository, req.body);
		res.sendStatus(204);
	},
);

lifecycleEventsRouter.post(
	'/enabled',
	authHeaderSymmetricJwtMiddleware,
	async (req, res) => {
		// await database.enableJiraTenant(req.body.clientKey);
		res.sendStatus(204);
	},
);

lifecycleEventsRouter.post(
	'/disabled',
	authHeaderSymmetricJwtMiddleware,
	async (req, res) => {
		// await database.disableJiraTenant(req.body.clientKey);
		res.sendStatus(204);
	},
);

lifecycleEventsRouter.post(
	'/uninstalled',
	authHeaderAsymmetricJwtMiddleware,
	async (req, res) => {
		// const { clientKey } = req.body;
		// await database.removeJiraTenant(clientKey);
		res.sendStatus(204);
	},
);
