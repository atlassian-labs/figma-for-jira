import { FIGMA_WEBHOOK_PAYLOAD_SCHEMA } from './schemas';
import { generateFigmaWebhookEventPayload } from './testing';

import {
	generateFigmaFileKey,
	generateFigmaFileName,
} from '../../../domain/entities/testing';
import { assertSchema, SchemaValidationError } from '../../../infrastructure';

describe('FIGMA_WEBHOOK_PAYLOAD_SCHEMA', () => {
	it('should validate a PING event payload with no file_key or file_name', () => {
		const payload = generateFigmaWebhookEventPayload({ event_type: 'PING' });

		expect(() =>
			assertSchema(payload, FIGMA_WEBHOOK_PAYLOAD_SCHEMA),
		).not.toThrow();
	});

	it('should throw an error for a FILE_UPDATE event payload with no file_key', () => {
		const payload = generateFigmaWebhookEventPayload({
			event_type: 'FILE_UPDATE',
			file_name: generateFigmaFileName(),
		});

		expect(() => assertSchema(payload, FIGMA_WEBHOOK_PAYLOAD_SCHEMA)).toThrow(
			SchemaValidationError,
		);
	});

	it('should throw an error for a FILE_UPDATE event payload with no file_name', () => {
		const payload = generateFigmaWebhookEventPayload({
			event_type: 'FILE_UPDATE',
			file_key: generateFigmaFileKey(),
		});

		expect(() => assertSchema(payload, FIGMA_WEBHOOK_PAYLOAD_SCHEMA)).toThrow(
			SchemaValidationError,
		);
	});

	it('should throw an error for a FILE_UPDATE event payload with a null file_key', () => {
		const payload = {
			...generateFigmaWebhookEventPayload({
				event_type: 'FILE_UPDATE',
				file_name: generateFigmaFileName(),
			}),
			file_key: null,
		};

		expect(() => assertSchema(payload, FIGMA_WEBHOOK_PAYLOAD_SCHEMA)).toThrow(
			SchemaValidationError,
		);
	});

	it('should throw an error for a FILE_UPDATE event payload with a null file_name', () => {
		const payload = {
			...generateFigmaWebhookEventPayload({
				event_type: 'FILE_UPDATE',
				file_key: generateFigmaFileName(),
			}),
			file_name: null,
		};

		expect(() => assertSchema(payload, FIGMA_WEBHOOK_PAYLOAD_SCHEMA)).toThrow(
			SchemaValidationError,
		);
	});
});
