export enum DesignStatus {
	READY_FOR_DEVELOPMENT = 'READY_FOR_DEVELOPMENT',
	UNKNOWN = 'UNKNOWN',
	NONE = 'NONE',
}

export enum DesignType {
	FILE = 'FILE',
	CANVAS = 'CANVAS',
	GROUP = 'GROUP',
	NODE = 'NODE',
	PROTOTYPE = 'PROTOTYPE',
	OTHER = 'OTHER',
}

type Association = {
	associationType: string;
	values: string[];
};

export type DataDepotDesign = {
	id: string;
	displayName: string;
	url: string;
	liveEmbedUrl: string;
	inspectUrl?: string;
	status: DesignStatus;
	type: DesignType;
	lastUpdated: string;
	updateSequenceNumber: number;
	addAssociations: Association[];
	removeAssociations: Association[];
};
