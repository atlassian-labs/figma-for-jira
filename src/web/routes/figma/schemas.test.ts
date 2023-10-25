import { FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA } from './schemas';
import { generateFigmaWebhookEventPayload } from './testing';

import {
	assertSchema,
	SchemaValidationError,
} from '../../../common/schema-validation';
import {
	generateFigmaFileKey,
	generateFigmaFileName,
} from '../../../domain/entities/testing';

describe('FIGMA_WEBHOOK_PAYLOAD_SCHEMA', () => {
	it('should validate a PING event payload with no file_key or file_name', () => {
		const body = generateFigmaWebhookEventPayload({ event_type: 'PING' });

		expect(() =>
			assertSchema({ body }, FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA),
		).not.toThrow();
	});

	it('should throw an error for a FILE_UPDATE event payload with no file_key', () => {
		const body = generateFigmaWebhookEventPayload({
			event_type: 'FILE_UPDATE',
			file_name: generateFigmaFileName(),
		});

		expect(() =>
			assertSchema({ body }, FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA),
		).toThrow(SchemaValidationError);
	});

	it('should throw an error for a FILE_UPDATE event payload with no file_name', () => {
		const body = generateFigmaWebhookEventPayload({
			event_type: 'FILE_UPDATE',
			file_key: generateFigmaFileKey(),
		});

		expect(() =>
			assertSchema({ body }, FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA),
		).toThrow(SchemaValidationError);
	});

	it('should throw an error for a FILE_UPDATE event payload with a null file_key', () => {
		const body = {
			...generateFigmaWebhookEventPayload({
				event_type: 'FILE_UPDATE',
				file_name: generateFigmaFileName(),
			}),
			file_key: null,
		};

		expect(() =>
			assertSchema({ body }, FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA),
		).toThrow(SchemaValidationError);
	});

	it('should throw an error for a FILE_UPDATE event payload with a null file_name', () => {
		const body = {
			...generateFigmaWebhookEventPayload({
				event_type: 'FILE_UPDATE',
				file_key: generateFigmaFileName(),
			}),
			file_name: null,
		};

		expect(() =>
			assertSchema({ body }, FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA),
		).toThrow(SchemaValidationError);
	});
});
