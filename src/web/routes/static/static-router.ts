import { Router, static as Static } from 'express';

import { join } from 'path';

export const staticRouter = Router();

// Static resources
staticRouter.use('/admin', Static(join(process.cwd(), 'admin/dist')));
staticRouter.use('/', Static(join(process.cwd(), 'static')));
