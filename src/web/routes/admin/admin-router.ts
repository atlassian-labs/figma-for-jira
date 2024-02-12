import { Router } from 'express';

import { authRouter } from './auth';
import { teamsRouter } from './teams';

import {
	jiraAdminOnlyAuthorizationMiddleware,
	jiraContextSymmetricJwtAuthenticationMiddleware,
} from '../../middleware/jira';

export const adminRouter = Router();

adminRouter.use(
	jiraContextSymmetricJwtAuthenticationMiddleware,
	jiraAdminOnlyAuthorizationMiddleware,
);

adminRouter.use('/auth', authRouter);
adminRouter.use('/teams', teamsRouter);
