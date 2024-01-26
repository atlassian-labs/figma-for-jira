import { Router, static as Static } from 'express';

import { join } from 'path';

import {
	jiraAdminOnlyAuthMiddleware,
	jiraQuerySymmetricJwtAuthMiddleware,
} from '../../middleware/jira';

export const staticRouter = Router();

staticRouter.use(
	'/admin/index.html',
	jiraQuerySymmetricJwtAuthMiddleware,
	jiraAdminOnlyAuthMiddleware,
);

staticRouter.use(
	'/issue-panel/issue-panel.html',
	jiraQuerySymmetricJwtAuthMiddleware,
);

// Static resources
staticRouter.use('/admin', Static(join(process.cwd(), 'admin/dist')));
staticRouter.use('/', Static(join(process.cwd(), 'static')));
