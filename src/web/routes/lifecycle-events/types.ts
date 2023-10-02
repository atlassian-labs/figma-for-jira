import type { Request, Response } from 'express';

export type InstalledConnectLifecycleEventRequestBody = {
	readonly key: string;
	readonly clientKey: string;
	readonly sharedSecret: string;
	readonly baseUrl: string;
	readonly displayUrl?: string;
};

export type InstalledConnectLifecycleEventRequest = Request<
	Record<string, never>,
	never,
	InstalledConnectLifecycleEventRequestBody,
	Record<string, never>,
	Record<string, never>
>;

export type UninstalledConnectLifecycleEventRequestBody = {
	readonly key: string;
	readonly clientKey: string;
	readonly baseUrl: string;
	readonly displayUrl?: string;
};

export type UninstalledConnectLifecycleEventRequest = Request<
	Record<string, never>,
	never,
	UninstalledConnectLifecycleEventRequestBody,
	Record<string, never>,
	Record<string, never>
>;

export type ConnectLifecycleEventResponse = Response<
	never,
	Record<string, never>
>;
