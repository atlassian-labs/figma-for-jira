import config from './config';
import logger from './infrastructure/logger';

import app from './app';

const port = config.server.port;
app.listen(port, () => {
	// App is now running
	logger.info(`App listening on port ${port}`);
});
