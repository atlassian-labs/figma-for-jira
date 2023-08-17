import { resolve } from 'path';
import { Router } from 'express';

export const authRouter = Router();

authRouter.get('/callback', function (req, res) {
	// MDTZ-905 - TODO:
	// 1. parse url and validate `state`
	// 2. exchange `code` for `access_token`
	// 3. store in database using by calling `delegateOAuthUseCase` here
	// 4. redirect user to './static/index.html'
	req.log.info('Received auth callback');
	const success = true;
	const errorMessage = '';
	res.redirect(
		`/public/index.html?success=${success}&errorMessage=${errorMessage}`,
	);
});
