export enum DesignStatus {
	READY_FOR_DEVELOPMENT = 'READY_FOR_DEVELOPMENT',
	UNKNOWN = 'UNKNOWN',
	NONE = 'NONE',
}

export enum DesignType {
	FILE = 'FILE', // A collection of multiple design canvases
	CANVAS = 'CANVAS', // A single page of various designs
	GROUP = 'GROUP', // A specified group of frames
	NODE = 'NODE', // A single frame or shape
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
	updateSequenceNumber: string;
	addAssociations: Association[];
	removeAssociations: Association[];
};
