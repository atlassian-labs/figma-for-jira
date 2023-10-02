import { v4 as uuidv4 } from 'uuid';

import type {
	InstalledConnectLifecycleEventRequestBody,
	UninstalledConnectLifecycleEventRequestBody,
} from '../types';

export const generateInstalledConnectLifecycleEventRequest = ({
	key = uuidv4(),
	clientKey = uuidv4(),
	sharedSecret = uuidv4(),
	baseUrl = `https://${uuidv4()}.atlassian.com`,
	displayUrl = `https://${uuidv4()}.atlassian.com`,
} = {}): InstalledConnectLifecycleEventRequestBody => ({
	key,
	clientKey,
	sharedSecret,
	baseUrl,
	displayUrl,
});

export const generateUninstalledConnectLifecycleEventRequest = ({
	key = uuidv4(),
	clientKey = uuidv4(),
	baseUrl = `https://${uuidv4()}.atlassian.com`,
	displayUrl = `https://${uuidv4()}.atlassian.com`,
} = {}): UninstalledConnectLifecycleEventRequestBody => ({
	key,
	clientKey,
	baseUrl,
	displayUrl,
});
