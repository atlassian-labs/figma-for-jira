import { Router, static as Static } from 'express';

import path from 'path';

export const spaRouter = Router();

//Assets from within the new spa experience in /spa/build/static
spaRouter.use('/', Static(path.join(process.cwd(), 'spa/dist')));
