import { Router } from 'express';

import { authRouter } from './auth';
import { teamsRouter } from './teams';

import {
	jiraAdminOnlyAuthMiddleware,
	jiraContextSymmetricJwtAuthMiddleware,
} from '../../middleware/jira';

export const adminRouter = Router();

adminRouter.use(
	jiraContextSymmetricJwtAuthMiddleware,
	jiraAdminOnlyAuthMiddleware,
);

adminRouter.use('/auth', authRouter);
adminRouter.use('/teams', teamsRouter);
