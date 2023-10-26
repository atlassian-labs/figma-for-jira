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

export type FigmaWebhookEventRequestBody =
	| FigmaPingWebhookEventRequestBody
	| FigmaFileUpdateWebhookEventRequestBody;

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
