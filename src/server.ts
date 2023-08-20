import app from './app';
import config from './config';
import logger from './infrastructure/logger';

const port = config.server.port;
app.listen(port, () => {
	// App is now running
	logger.info(`App listening on port ${port}`);
});
