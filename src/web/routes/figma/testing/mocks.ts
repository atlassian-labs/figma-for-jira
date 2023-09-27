import { v4 as uuidv4 } from 'uuid';

import type { FigmaWebhookEventPayload } from '../types';

export const generateFigmaWebhookEventPayload = ({
	event_type = 'FILE_UPDATE',
	file_key,
	file_name,
	passcode = 'passcode',
	protocol_version = '2',
	retries = 0,
	timestamp = new Date().toISOString(),
	webhook_id = uuidv4(),
	triggered_by = undefined,
}: Partial<FigmaWebhookEventPayload> = {}): FigmaWebhookEventPayload => ({
	event_type,
	file_key,
	file_name,
	passcode,
	protocol_version,
	retries,
	timestamp,
	webhook_id,
	triggered_by,
});
