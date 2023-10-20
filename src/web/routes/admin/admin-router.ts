import { Router, static as Static } from 'express';

import path from 'path';

export const adminRouter = Router();

adminRouter.use('/', Static(path.join(process.cwd(), 'admin/dist')));
