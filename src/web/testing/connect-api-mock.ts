import { HttpStatusCode } from 'axios';
import nock from 'nock';

/**
 * @see https://developer.atlassian.com/cloud/jira/platform/security-for-connect-apps/#validating-installation-lifecycle-requests
 */
export const mockConnectGetKeyEndpoint = ({
	baseUrl,
	keyId,
	status = HttpStatusCode.Ok,
	response,
}: {
	baseUrl: string;
	keyId: string;
	response?: string;
	status: HttpStatusCode;
}) => {
	nock(baseUrl).get(`/${keyId}`).reply(status, response);
};
