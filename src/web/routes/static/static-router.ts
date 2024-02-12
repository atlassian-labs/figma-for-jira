import { Router, static as Static } from 'express';

import { join } from 'path';

import {
	jiraAdminOnlyAuthorizationMiddleware,
	jiraContextSymmetricJwtFromQueryAuthenticationMiddleware,
} from '../../middleware/jira';

export const staticRouter = Router();

staticRouter.use(
	'/admin/index.html',
	jiraContextSymmetricJwtFromQueryAuthenticationMiddleware,
	jiraAdminOnlyAuthorizationMiddleware,
);

staticRouter.use(
	'/issue-panel/issue-panel.html',
	jiraContextSymmetricJwtFromQueryAuthenticationMiddleware,
);

// Static resources
staticRouter.use('/admin', Static(join(process.cwd(), 'admin/dist')));
staticRouter.use('/', Static(join(process.cwd(), 'static')));
