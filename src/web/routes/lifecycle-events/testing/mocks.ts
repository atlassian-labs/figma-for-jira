import { v4 as uuidv4 } from 'uuid';

import type { ConnectLifecycleEventRequestBody } from '../types';

export const generateConnectLifecycleRequest = ({
	key = uuidv4(),
	clientKey = uuidv4(),
	sharedSecret = uuidv4(),
	baseUrl = `https://${uuidv4()}.atlassian.com`,
	displayUrl = `https://${uuidv4()}.atlassian.com`,
} = {}): ConnectLifecycleEventRequestBody => ({
	key,
	clientKey,
	sharedSecret,
	baseUrl,
	displayUrl,
});
