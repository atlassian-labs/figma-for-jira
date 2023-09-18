export type GetIssueResponse = {
	readonly id: string;
	readonly self: string;
	readonly key: string;
	readonly fields: {
		readonly summary: string;
	};
};

export type GetIssuePropertyResponse = {
	readonly key: string;
	readonly value: unknown;
};

export type Association = {
	readonly associationType: string;
	readonly values: string[];
};

export type SubmitDesignsRequest = {
	readonly designs: {
		readonly id: string;
		readonly displayName: string;
		readonly url: string;
		readonly liveEmbedUrl: string;
		readonly inspectUrl?: string;
		readonly status: string;
		readonly type: string;
		readonly lastUpdated: string;
		readonly updateSequenceNumber: number;
		readonly addAssociations: Association[] | null;
		readonly removeAssociations: Association[] | null;
	}[];
};

export type DesignKey = {
	readonly designId: string;
};

export type SubmitDesignsResponse = {
	readonly acceptedEntities: DesignKey[];
	readonly rejectedEntities: {
		readonly key: DesignKey;
		readonly errors: {
			readonly message: string;
		}[];
	}[];
	readonly unknownIssueKeys?: string[];
	readonly unknownAssociations?: Association[];
};
