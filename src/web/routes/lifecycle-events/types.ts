import type { Request, Response } from 'express';

export type ConnectLifecycleEventRequestBody = {
	readonly key: string;
	readonly clientKey: string;
	readonly sharedSecret: string;
	readonly baseUrl: string;
	readonly displayUrl?: string;
};

export type ConnectLifecycleEventRequest = Request<
	Record<string, never>,
	never,
	ConnectLifecycleEventRequestBody,
	Record<string, never>,
	Record<string, never>
>;

export type ConnectLifecycleEventResponse = Response<
	never,
	Record<string, never>
>;
