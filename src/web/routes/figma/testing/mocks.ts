import type {
	WebhookDevModeStatusUpdatePayload,
	WebhookFileDeletePayload,
	WebhookFileUpdatePayload,
	WebhookPingPayload,
} from '@figma/rest-api-spec';
import { v4 as uuidv4 } from 'uuid';

import {
	generateFigmaFileKey,
	generateFigmaFileName,
	generateFigmaNodeId,
} from '../../../../domain/entities/testing';

export const generatePingWebhookEventRequestBody = ({
	passcode = uuidv4(),
	timestamp = new Date().toISOString(),
	webhook_id = uuidv4(),
}: Partial<WebhookPingPayload> = {}): WebhookPingPayload => ({
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
}: Partial<WebhookFileUpdatePayload> = {}): WebhookFileUpdatePayload => ({
	event_type: 'FILE_UPDATE',
	file_key,
	file_name,
	passcode,
	timestamp,
	webhook_id,
});

export const generateFileDeleteWebhookEventRequestBody = ({
	webhook_id = uuidv4(),
	file_key = uuidv4(),
	file_name = uuidv4(),
	passcode = uuidv4(),
	timestamp = new Date().toISOString(),
}: Partial<WebhookFileDeletePayload> = {}): WebhookFileDeletePayload => ({
	event_type: 'FILE_DELETE',
	webhook_id,
	file_key,
	file_name,
	triggered_by: {
		id: uuidv4(),
		handle: uuidv4(),
		img_url: uuidv4(),
	},
	passcode,
	timestamp,
});

export const generateDevModeStatusUpdateWebhookEventRequestBody = ({
	webhook_id = uuidv4(),
	passcode = uuidv4(),
	file_key = generateFigmaFileKey(),
	file_name = generateFigmaFileName(),
	node_id = generateFigmaNodeId(),
	related_links = [],
	status = 'active',
	triggered_by = {
		id: uuidv4(),
		handle: uuidv4(),
		img_url: uuidv4(),
	},
	timestamp = new Date().toISOString(),
}: Partial<WebhookDevModeStatusUpdatePayload> = {}): WebhookDevModeStatusUpdatePayload => ({
	event_type: 'DEV_MODE_STATUS_UPDATE',
	webhook_id,
	passcode,
	timestamp,
	file_key,
	file_name,
	node_id,
	related_links,
	status,
	triggered_by,
});
