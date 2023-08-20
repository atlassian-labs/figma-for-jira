import * as fs from 'fs';
import * as path from 'path';

const envFileName = '.env';
const envFilePath = path.resolve(__dirname, '..', envFileName);

/**
 * Fetching the list of running tunnels
 *
 * https://ngrok.com/docs/ngrok-agent/api/#request
 */
const callTunnel = async () => {
	const response = await fetch('http://localhost:4040/api/tunnels');
	if (response.ok) {
		const body = await response.json();
		if (body.tunnels.length === 0) {
			throw new Error('No tunnels available');
		}
		return body;
	}
	return undefined;
};

const waitAndCallTunnel = async () => {
	await new Promise((resolve) => {
		setTimeout(resolve, 5000);
	});

	return callTunnel();
};

const waitForTunnel = async (): Promise<string | void> => {
	// Call the service 3 times until ready
	const response = await callTunnel()
		.catch(waitAndCallTunnel)
		.catch(waitAndCallTunnel)
		.catch(() => undefined);
	if (response) {
		try {
			let envContents = fs.readFileSync(envFilePath, { encoding: 'utf-8' });
			const tunnel = response.tunnels.find((tunnel) =>
				tunnel.public_url.startsWith('https'),
			);
			const ngrokUrl = tunnel.public_url;
			console.info(`ngrok forwarding ${ngrokUrl} to ${tunnel.config.addr}`);
			envContents = envContents.replace(/APP_URL=.*/, `APP_URL=${ngrokUrl}`);
			fs.writeFileSync(envFilePath, envContents);
			console.info(
				`Updated ${envFileName} file to use ngrok domain '${ngrokUrl}'.`,
			);
			return ngrokUrl;
		} catch (e) {
			console.info(`'${envFilePath}' not found, skipping...`, e);
		}
	} else {
		console.info(`Ngrok not running, skipping updating ${envFileName} file.`);
	}
};

/**
 * This method update the APP_URL in the env file with the ngrok tunneled URL
 */
(async function main() {
	try {
		await waitForTunnel();
		process.exit();
	} catch (e) {
		process.exit(1);
	}
})();
