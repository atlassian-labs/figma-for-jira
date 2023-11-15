import type { Request, Response } from 'express';

import type { FigmaTeam } from '../../../domain/entities';

export type FigmaPingWebhookEventRequestBody = {
	readonly event_type: 'PING';
	readonly webhook_id: string;
	readonly passcode: string;
	readonly timestamp: string;
};

export type FigmaFileUpdateWebhookEventRequestBody = {
	readonly event_type: 'FILE_UPDATE';
	readonly webhook_id: string;
	readonly file_key: string;
	readonly file_name: string;
	readonly passcode: string;
	readonly timestamp: string;
};

/**
 * @remarks
 * Currently, not handled but its sent within a subscription to `FILE_UPDATE` events.
 * See for more detail: https://www.figma.com/developers/api#webhooks-v2-events
 */
export type FigmaFileDeleteWebhookEventRequestBody = {
	readonly event_type: 'FILE_DELETE';
	readonly webhook_id: string;
	readonly file_key: string;
	readonly passcode: string;
};

export type FigmaWebhookEventRequestBody =
	| FigmaPingWebhookEventRequestBody
	| FigmaFileUpdateWebhookEventRequestBody
	| FigmaFileDeleteWebhookEventRequestBody;

export type FigmaWebhookEventLocals = {
	readonly figmaTeam: FigmaTeam;
};

export type FigmaWebhookEventRequest = Request<
	Record<string, never>,
	never,
	FigmaWebhookEventRequestBody,
	Record<string, never>,
	FigmaWebhookEventLocals
>;

export type FigmaWebhookEventResponse = Response<
	never,
	FigmaWebhookEventLocals
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
