import { createJwtToken } from '../src/infrastructure/jira/jira-client/jwt-utils';
import { Duration } from '../src/common/duration';

const { INSTALLATION_CLIENT_KEY, INSTALLATION_CLIENT_SECRET } = process.env;

if (!INSTALLATION_CLIENT_KEY || !INSTALLATION_CLIENT_SECRET) {
	throw new Error('Missing required environment variables');
}

const method = process.argv[2];
const url = new URL(process.argv[3]);

const jwt = createJwtToken({
	request: {
		method,
		pathname: url.pathname,
	},
	connectClientKey: INSTALLATION_CLIENT_KEY,
	connectSharedSecret: INSTALLATION_CLIENT_SECRET,
	expiresIn: Duration.ofMinutes(99999),
});

console.log(`JWT ${jwt}`);
