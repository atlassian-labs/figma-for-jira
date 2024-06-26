export type GetOAuth2TokenResponse = {
	readonly access_token: string;
	readonly refresh_token: string;
	readonly expires_in: number;
};

export type RefreshOAuth2TokenResponse = Omit<
	GetOAuth2TokenResponse,
	'refresh_token'
>;

export type GetMeResponse = {
	readonly id: string;
	readonly email: string;
};

export type GetFileParams = {
	/**
	 * @remarks
	 * `0` is not documented but a fully supported value when used with the `ids` parameter. If `depth` is:
	 * - >= 1, it is interpreted relative to the document root.
	 * - 0, it is interpreted as relative to the target node(s) with IDs from the `ids` parameter. Consider using 0,
	 * 	when you need to exclude the children of the target nodes.
	 */
	readonly depth?: number;
	readonly ids?: string[];
	readonly node_last_modified?: boolean;
};

export type GetFileResponse = {
	readonly name: string;
	readonly lastModified: string;
	readonly editorType: string;
	readonly document: Node;
};

export type GetFileMetaResponse = {
	readonly file: {
		readonly name: string;
		readonly last_touched_at: string;
		readonly last_touched_by?: {
			readonly id: string;
		} | null;
		readonly editorType: string;
	};
};

export type Node = {
	readonly id: string;
	readonly name: string;
	readonly type: string;
	readonly devStatus?: NodeDevStatus;
	/**
	 * Available only for top-level nodes (e.g., page nodes, top-level frames/components/instances, etc.).
	 *
	 * Older files that were created before `lastModified` got tracked might not have `lastModified`,
	 * so do not assume that it exists.
	 */
	readonly lastModified?: string;
	readonly children?: Node[];
};

export type NodeDevStatus = {
	readonly type: string;
};

export type DevResource = {
	readonly id: string;
	readonly name: string;
	readonly url: string;
	readonly file_key: string;
	readonly node_id: string;
};

export type CreateDevResourcesRequest = {
	readonly dev_resources: Omit<DevResource, 'id'>[];
};

export type CreateDevResourceError = {
	readonly file_key: string | null;
	readonly node_id: string | null;
	readonly error: string;
};

export type CreateDevResourcesResponse = {
	readonly errors: CreateDevResourceError[];
};

export type GetDevResourcesRequest = {
	readonly fileKey: string;
	readonly nodeIds?: string[];
	readonly accessToken: string;
};

export type GetDevResourcesResponse = {
	readonly dev_resources: DevResource[];
};

export type DeleteDevResourceRequest = {
	readonly fileKey: string;
	readonly devResourceId: string;
	readonly accessToken: string;
};

export type CreateWebhookRequest = {
	readonly event_type: string;
	readonly team_id: string;
	readonly endpoint: string;
	readonly passcode: string;
	readonly status?: string;
	readonly description?: string;
};

export type CreateWebhookResponse = {
	readonly id: string;
	readonly team_id: string;
	readonly event_type: string;
	readonly client_id: string;
	readonly endpoint: string;
	readonly passcode: string;
	readonly status: string;
	readonly description: string | null;
	readonly protocol_version: string;
};

export type GetTeamProjectsResponse = {
	readonly name: string;
	readonly projects: {
		readonly id: string;
		readonly name: string;
	}[];
};

export type ErrorResponse = {
	readonly message: string;
	readonly reason?: string;
};
