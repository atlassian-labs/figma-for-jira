export enum DesignStatus {
	READY_FOR_DEVELOPMENT,
	UNKNOWN,
	NONE,
}

export enum DesignType {
	FILE, // A collection of multiple design canvases
	CANVAS, // A single page of various designs
	GROUP, // A specified group of frames
	NODE, // A single frame or shape
	PROTOTYPE,
	OTHER,
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
