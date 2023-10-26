import type { Request } from 'express';

import type { FigmaWebhookEventType } from '../../../domain/entities';

export type FigmaWebhookEventPayload = {
	readonly event_type: FigmaWebhookEventType;
	readonly file_key?: string;
	readonly file_name?: string;
	readonly passcode: string;
	readonly protocol_version: string;
	readonly retries: number;
	readonly timestamp: string;
	readonly webhook_id: string;
	readonly triggered_by?: {
		readonly id: string;
		readonly handle: string;
	};
};

export type FigmaWebhookRequest = Request<
	Record<string, never>,
	never,
	FigmaWebhookEventPayload,
	Record<string, never>,
	never
>;

export type FigmaOAuth2CallbackQueryParameters = {
	readonly code: string;
	readonly state: string;
};

export type FigmaOAuth2CallbackRequest = Request<
	Record<string, never>,
	never,
	never,
	FigmaOAuth2CallbackQueryParameters,
	never
>;
