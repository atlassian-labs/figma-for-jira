import express, { json } from 'express';
import { RootRouter } from './routes/router';

const app = express();

// Calling the express.json() method for parsing
app.use(json());

// Setting the routes
app.use(RootRouter);

const port = 3000;
app.listen(port, async () => {
	// App is now running
	console.log(`App listening on port ${port}`);
});
