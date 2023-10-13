import axios from 'axios';

import { getConfig } from '../../../config';
import { UnauthorizedError } from '../../../web/middleware/errors';

export class ConnectKeyServerClient {
	/**
	 * Returns the public key for asymmetric JWT token validation.
	 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#verifying-a-asymmetric-jwt-token-for-install-callbacks
	 */
	getAtlassianConnectPublicKey = async (keyId: string): Promise<string> => {
		try {
			const response = await axios.get<string>(
				`${getConfig().jira.connectKeyServerUrl}/${keyId}`,
			);
			return response.data;
		} catch (e: unknown) {
			throw new UnauthorizedError(
				`Unable to get public key for keyId ${keyId}`,
			);
		}
	};
}

export const connectKeyServerClient = new ConnectKeyServerClient();
