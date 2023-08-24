import app from './app';
import { getConfig } from './config';
import { logger } from './infrastructure';

const port = getConfig().server.port;
app.listen(port, () => {
	// App is now running
	logger.info(`App listening on port %d`, port);
});
