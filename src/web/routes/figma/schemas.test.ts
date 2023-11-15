import { FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA } from './schemas';
import {
	generateFileDeleteWebhookEventRequestBody,
	generateFileUpdateWebhookEventRequestBody,
	generatePingWebhookEventRequestBody,
} from './testing';

import {
	assertSchema,
	SchemaValidationError,
} from '../../../common/schema-validation';

describe('FIGMA_WEBHOOK_PAYLOAD_SCHEMA', () => {
	describe('PING', () => {
		it('should validate a PING event request body', () => {
			const body = generatePingWebhookEventRequestBody();

			expect(() =>
				assertSchema({ body }, FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA),
			).not.toThrow();
		});

		it('should throw if PING event request body does not have required field', () => {
			const body = {
				...generatePingWebhookEventRequestBody(),
				passcode: undefined,
			};
			expect(() =>
				assertSchema({ body }, FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA),
			).toThrow();
		});
	});

	describe('FILE_UPDATE', () => {
		it('should validate FILE_UPDATE event request body', () => {
			const body = generateFileUpdateWebhookEventRequestBody();

			expect(() =>
				assertSchema({ body }, FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA),
			).not.toThrow();
		});

		it('should throw an error if FILE_UPDATE event request body does not have required field', () => {
			const body = {
				...generateFileUpdateWebhookEventRequestBody(),
				file_key: undefined,
			};

			expect(() =>
				assertSchema({ body }, FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA),
			).toThrow(SchemaValidationError);
		});
	});

	describe('FILE_DELETE', () => {
		it('should validate FILE_DELETE event request body', () => {
			const body = generateFileDeleteWebhookEventRequestBody();

			expect(() =>
				assertSchema({ body }, FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA),
			).not.toThrow();
		});

		it('should throw an error if FILE_DELETE event request body does not have required field', () => {
			const body = {
				...generateFileDeleteWebhookEventRequestBody(),
				file_key: undefined,
			};

			expect(() =>
				assertSchema({ body }, FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA),
			).toThrow(SchemaValidationError);
		});
	});
});
