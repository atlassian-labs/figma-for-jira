export enum AtlassianDesignStatus {
	READY_FOR_DEVELOPMENT = 'READY_FOR_DEVELOPMENT',
	UNKNOWN = 'UNKNOWN',
	NONE = 'NONE',
}

export enum AtlassianDesignType {
	FILE = 'FILE',
	CANVAS = 'CANVAS',
	GROUP = 'GROUP',
	NODE = 'NODE',
	PROTOTYPE = 'PROTOTYPE',
	OTHER = 'OTHER',
}

export type Association = {
	readonly associationType: string;
	readonly values: string[];
};

/**
 * An Atlassian representation of a Design from a provider.
 *
 * TODO: Replace a link below with a link to public Data Depot documentation.
 * @see https://hello.atlassian.net/wiki/spaces/MDT/pages/2803802934/Proposed+Design+Schema
 */
export type AtlassianDesign = {
	readonly id: string;
	readonly displayName: string;
	readonly url: string;
	readonly liveEmbedUrl: string;
	readonly inspectUrl?: string;
	readonly status: AtlassianDesignStatus;
	readonly type: AtlassianDesignType;
	readonly lastUpdated: string;
	readonly updateSequenceNumber: number;
	readonly addAssociations: Association[];
	readonly removeAssociations: Association[];
};
