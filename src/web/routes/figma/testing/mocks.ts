import { v4 as uuidv4 } from 'uuid';

import type {
	FigmaFileUpdateWebhookEventRequestBody,
	FigmaPingWebhookEventRequestBody,
} from '../types';

export const generatePingWebhookEventRequestBody = ({
	passcode = uuidv4(),
	timestamp = new Date().toISOString(),
	webhook_id = uuidv4(),
}: Partial<FigmaPingWebhookEventRequestBody> = {}): FigmaPingWebhookEventRequestBody => ({
	event_type: 'PING',
	passcode,
	timestamp,
	webhook_id,
});

export const generateFileUpdateWebhookEventRequestBody = ({
	file_key = uuidv4(),
	file_name = uuidv4(),
	passcode = uuidv4(),
	timestamp = new Date().toISOString(),
	webhook_id = uuidv4(),
}: Partial<FigmaFileUpdateWebhookEventRequestBody> = {}): FigmaFileUpdateWebhookEventRequestBody => ({
	event_type: 'FILE_UPDATE',
	file_key,
	file_name,
	passcode,
	timestamp,
	webhook_id,
});
