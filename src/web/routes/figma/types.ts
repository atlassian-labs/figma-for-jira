import type {
	WebhookDevModeStatusUpdatePayload,
	WebhookFileDeletePayload,
	WebhookFileUpdatePayload,
	WebhookPingPayload,
} from '@figma/rest-api-spec';
import type { Request, Response } from 'express';

import type { FigmaFileWebhook, FigmaTeam } from '../../../domain/entities';

/**
 * @remarks
 * WebhookFileUpdatePayload is currently not handled but it's sent within a subscription to `FILE_UPDATE` events.
 * See for more detail: https://www.figma.com/developers/api#webhooks-v2-events
 */
export type FigmaWebhookEventRequestBody =
	| WebhookPingPayload
	| WebhookFileUpdatePayload
	| WebhookFileDeletePayload
	| WebhookDevModeStatusUpdatePayload;

export type FigmaWebhookInfo =
	| {
			readonly figmaTeam: FigmaTeam;
			readonly webhookType: 'team';
	  }
	| {
			readonly figmaFileWebhook: FigmaFileWebhook;
			readonly webhookType: 'file';
	  };
export type FigmaWebhookEventLocals = { webhookInfo: FigmaWebhookInfo };

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
