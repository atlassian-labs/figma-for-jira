import { FileNodesResponse, FileResponse, NodeDevStatus } from './figma-client';

import {
	DataDepotDesign,
	DesignStatus,
	DesignType,
} from '../../domain/entities/design';
import { AssociateWith } from '../../web/routes/entities';

export type FigmaUrlData = {
	fileKey: string;
	nodeId?: string;
	isPrototype: boolean;
};

export const extractDataFromFigmaUrl = (url: string): FigmaUrlData | null => {
	const fileKeyRegex = /file\/([a-zA-Z0-9]+)/;
	const nodeIdRegex = /node-id=([a-zA-Z0-9-]+)/;
	const prototypeRegex = /\/proto\//;

	const fileKeyMatch = url.match(fileKeyRegex);
	const nodeIdMatch = url.match(nodeIdRegex);
	const isPrototype = prototypeRegex.test(url);

	if (!fileKeyMatch) {
		return null;
	}

	const fileKey = fileKeyMatch[1];
	const nodeId = nodeIdMatch ? nodeIdMatch[1] : undefined;

	return {
		fileKey,
		nodeId,
		isPrototype,
	};
};

export const buildLiveEmbedUrl = (url: string): string => {
	// TODO: implement this function
	return url;
};

export const buildInspectUrl = (url: string): string => {
	// TODO: implement this function
	return url;
};

export const transformNodeId = (nodeId: string): string => {
	return nodeId.replace('-', ':');
};

const mapNodeStatusToDevStatus = (devStatus: NodeDevStatus): DesignStatus =>
	devStatus.type === 'READY_FOR_DEV'
		? DesignStatus.READY_FOR_DEVELOPMENT
		: DesignStatus.UNKNOWN;

const mapNodeTypeToDesignType = (
	type: string,
	isPrototype: boolean,
): DesignType => {
	if (isPrototype) {
		return DesignType.PROTOTYPE;
	}
	if (type === 'DOCUMENT') {
		return DesignType.FILE;
	}
	if (type === 'CANVAS') {
		return DesignType.CANVAS;
	}
	if (type === 'SECTION' || type === 'GROUP') {
		return DesignType.GROUP;
	}
	if (type === 'FRAME') {
		return DesignType.NODE;
	}
	return DesignType.OTHER;
};

type TransformNodeToDataDepotDesignArgs = {
	nodeId: string;
	url: string;
	isPrototype: boolean;
	associateWith: AssociateWith;
	fileNodesResponse: FileNodesResponse;
};

export const transformNodeToDataDepotDesign = ({
	nodeId,
	url,
	isPrototype,
	associateWith,
	fileNodesResponse,
}: TransformNodeToDataDepotDesignArgs): DataDepotDesign => {
	const node = fileNodesResponse.nodes[transformNodeId(nodeId)].document;
	return {
		id: node.id,
		displayName: node.name,
		url,
		liveEmbedUrl: buildLiveEmbedUrl(url),
		inspectUrl: buildInspectUrl(url),
		status: node.devStatus
			? mapNodeStatusToDevStatus(node.devStatus)
			: DesignStatus.NONE,
		type: mapNodeTypeToDesignType(node.type, isPrototype),
		// TODO: need to get the last modified of the node once available in Figma's API
		lastUpdated: fileNodesResponse.lastModified,
		// TODO: How do we generate this?
		updateSequenceNumber: '123',
		// TODO: associationType should be a const
		addAssociations: [
			{ associationType: 'issue-has-design', values: [associateWith.ari] },
		],
		removeAssociations: [],
	};
};

type TransformFileToDataDepotDesignArgs = {
	url: string;
	isPrototype: boolean;
	associateWith: AssociateWith;
	fileResponse: FileResponse;
};

export const transformFileToDataDepotDesign = ({
	url,
	isPrototype,
	associateWith,
	fileResponse,
}: TransformFileToDataDepotDesignArgs): DataDepotDesign => {
	return {
		id: fileResponse.document.id,
		displayName: fileResponse.name,
		url,
		liveEmbedUrl: buildLiveEmbedUrl(url),
		inspectUrl: buildInspectUrl(url),
		status: DesignStatus.NONE,
		type: isPrototype ? DesignType.PROTOTYPE : DesignType.FILE,
		lastUpdated: fileResponse.lastModified,
		// TODO: How do we generate this?
		updateSequenceNumber: '123',
		// TODO: associationType should be a const
		addAssociations: [
			{ associationType: 'issue-has-design', values: [associateWith.ari] },
		],
		removeAssociations: [],
	};
};
