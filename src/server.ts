import app from './app';
import { getConfig } from './config';
import { getLogger } from './infrastructure';

const port = getConfig().server.port;
app.listen(port, () => {
	// App is now running
	getLogger().info(`App listening on port %d`, port);
});
