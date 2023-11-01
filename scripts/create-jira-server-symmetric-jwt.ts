import { createQueryStringHash, encodeSymmetric } from 'atlassian-jwt';
import querystring from 'querystring';
import { Command, InvalidArgumentError } from 'commander';

const program = new Command();

const intParser = (value: string) => {
	const parsedValue = parseInt(value, 10);
	if (isNaN(parsedValue)) throw new InvalidArgumentError('Not a number.');

	return parsedValue;
};

program
	.description(
		'Generates a Jira server symmetric JWT token. For more detail, see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token',
	)
	.requiredOption(
		'--clientKey <clientKey>',
		'Identifying key for the Atlassian product tenant that the app was installed into. Find in the `jira_connect_installation` table after the app installation.',
	)
	.requiredOption(
		'--sharedSecret <sharedSecret>',
		'A shared secret for signing JWT tokens. Find in the `jira_connect_installation` table after the app installation.',
	)
	.requiredOption('--method <method>', 'An HTTP method (e.g., `GET`)')
	.requiredOption(
		'--endpoint <endpoint>',
		'An endpoint with pathname and query parameters (e.g., `/auth/checkAuth?userId=xyz`).',
	)
	.option('--expiresIn <expiresIn>', 'Expiration in seconds.', intParser, 9999)
	.parse();

const { clientKey, sharedSecret, method, endpoint, expiresIn } = program.opts();
const [pathname, query] = endpoint.split('?');

const nowInSeconds = Math.floor(Date.now() / 1000);

const jwtToken = encodeSymmetric(
	{
		iat: nowInSeconds,
		exp: nowInSeconds + expiresIn,
		iss: clientKey,
		qsh: createQueryStringHash({
			method,
			pathname,
			query: query ? querystring.parse(query) : undefined,
		}),
	},
	sharedSecret,
);

console.log('✅ Server symmetric JWT token generated:');
console.log(jwtToken);
