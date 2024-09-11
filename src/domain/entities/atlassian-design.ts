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

export interface AtlassianProviderUser {
	readonly id: string;
}

/**
 * An Atlassian representation of a Design from a provider.
 */
export type AtlassianDesign = {
	readonly id: string;
	/**
	 * The name of the design.
	 * Should not exceed 255 characters.
	 */
	readonly displayName: string;
	readonly url: string;
	readonly liveEmbedUrl: string;
	readonly inspectUrl?: string;
	readonly status: AtlassianDesignStatus;
	readonly type: AtlassianDesignType;
	readonly lastUpdated: string;
	readonly lastUpdatedBy?: AtlassianProviderUser;
	readonly iconUrl?: string;
	readonly updateSequenceNumber: number;
};
