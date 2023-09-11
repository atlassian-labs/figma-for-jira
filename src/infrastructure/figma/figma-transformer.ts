import type {
	CreateDevResourcesRequest,
	FileNodesResponse,
	FileResponse,
	NodeDevStatus,
} from './figma-client';

import { getConfig } from '../../config';
import type { AtlassianDesign } from '../../domain/entities';
import {
	AtlassianDesignStatus,
	AtlassianDesignType,
} from '../../domain/entities';

export type FigmaUrlData = {
	readonly fileKey: string;
	readonly nodeId?: string;
	readonly isPrototype: boolean;
};

export const extractDataFromFigmaUrl = (url: string): FigmaUrlData | null => {
	const fileKeyRegex = /file\/([a-zA-Z0-9]+)/;
	const nodeIdRegex = /node-id=([a-zA-Z0-9-]+)/;
	const prototypeRegex = /proto\/([a-zA-Z0-9]+)/;

	const fileKeyMatch = url.match(fileKeyRegex);
	const nodeIdMatch = url.match(nodeIdRegex);
	const prototypeMatch = url.match(prototypeRegex);
	const isPrototype = prototypeRegex.test(url);

	if (!fileKeyMatch && !prototypeMatch) {
		return null;
	}

	const fileKey = fileKeyMatch ? fileKeyMatch[1] : prototypeMatch![1];
	const nodeId = nodeIdMatch ? nodeIdMatch[1] : undefined;

	return {
		fileKey,
		...(nodeId && { nodeId }),
		isPrototype,
	};
};

// Taken from https://www.figma.com/developers/embed
const FIGMA_URL_REGEX =
	/https:\/\/([\w.-]+\.)?figma.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/;

/**
 * Validates that a string is a valid Figma URL that will be handled by Figma's embed endpoint,
 * then transforms that string into a live embed URL.
 * @see https://www.figma.com/developers/embed
 */
export const buildLiveEmbedUrl = (url: string): string => {
	if (!FIGMA_URL_REGEX.test(url)) {
		throw new Error('Not a valid Figma URL');
	}
	const urlObject = new URL(`${getConfig().figma.liveEmbedBaseUrl}/embed`);
	urlObject.searchParams.append('embed_host', 'atlassian');
	urlObject.searchParams.append('url', url);
	return urlObject.toString();
};

/**
 * Transforms a regular Figma URL into an Inspect mode URL.
 */
export const buildInspectUrl = (url: string): string => {
	const urlObject = new URL(url);
	urlObject.searchParams.delete('type');
	urlObject.searchParams.delete('t');
	urlObject.searchParams.set('mode', 'dev');
	return urlObject.toString();
};

export const transformNodeId = (nodeId: string): string => {
	return nodeId.replace('-', ':');
};

/**
 * Maps a Figma devStatus to an Atlassian Design entity status.
 * @see SECTION on https://www.figma.com/developers/api#node-types
 * @returns
 */
export const mapNodeStatusToDevStatus = (
	devStatus: NodeDevStatus,
): AtlassianDesignStatus =>
	devStatus.type === 'READY_FOR_DEV'
		? AtlassianDesignStatus.READY_FOR_DEVELOPMENT
		: AtlassianDesignStatus.UNKNOWN;

/**
 * Maps a Figma node type to an Atlassian Design entity type.
 * @see https://www.figma.com/developers/api#node-types
 * @returns
 */
export const mapNodeTypeToDesignType = (
	type: string,
	isPrototype: boolean,
): AtlassianDesignType => {
	if (isPrototype) {
		return AtlassianDesignType.PROTOTYPE;
	}
	if (type === 'DOCUMENT') {
		return AtlassianDesignType.FILE;
	}
	if (type === 'CANVAS') {
		return AtlassianDesignType.CANVAS;
	}
	if (type === 'SECTION' || type === 'GROUP') {
		return AtlassianDesignType.GROUP;
	}
	if (type === 'FRAME') {
		return AtlassianDesignType.NODE;
	}
	return AtlassianDesignType.OTHER;
};

const getUpdateSequenceNumber = (input: string): number => {
	const updateSequenceNumber = parseInt(input, 10);
	if (isNaN(updateSequenceNumber)) {
		throw new Error('Could not convert version to update sequence number');
	}
	return updateSequenceNumber;
};

type TransformNodeToAtlassianDesignParams = {
	readonly nodeId: string;
	readonly url: string;
	readonly isPrototype: boolean;
	readonly fileNodesResponse: FileNodesResponse;
};

export const transformNodeToAtlassianDesign = ({
	nodeId,
	url,
	isPrototype,
	fileNodesResponse,
}: TransformNodeToAtlassianDesignParams): AtlassianDesign => {
	const node = fileNodesResponse.nodes[transformNodeId(nodeId)].document;
	return {
		id: node.id,
		displayName: node.name,
		url,
		liveEmbedUrl: buildLiveEmbedUrl(url),
		inspectUrl: buildInspectUrl(url),
		status: node.devStatus
			? mapNodeStatusToDevStatus(node.devStatus)
			: AtlassianDesignStatus.NONE,
		type: mapNodeTypeToDesignType(node.type, isPrototype),
		// TODO: lastUpdated should be determined by the nearest parent node's lastModified time once Figma have implemented lastModified
		lastUpdated: fileNodesResponse.lastModified,
		updateSequenceNumber: getUpdateSequenceNumber(fileNodesResponse.version),
	};
};

type TransformFileToAtlassianDesignParams = {
	readonly url: string;
	readonly fileKey: string;
	readonly isPrototype: boolean;
	readonly fileResponse: FileResponse;
};

export const transformFileToAtlassianDesign = ({
	url,
	fileKey,
	isPrototype,
	fileResponse,
}: TransformFileToAtlassianDesignParams): AtlassianDesign => {
	return {
		id: fileKey,
		displayName: fileResponse.name,
		url,
		liveEmbedUrl: buildLiveEmbedUrl(url),
		inspectUrl: buildInspectUrl(url),
		status: AtlassianDesignStatus.NONE,
		type: isPrototype
			? AtlassianDesignType.PROTOTYPE
			: AtlassianDesignType.FILE,
		lastUpdated: fileResponse.lastModified,
		updateSequenceNumber: getUpdateSequenceNumber(fileResponse.version),
	};
};

export const buildDevResource = ({
	name,
	url,
	file_key,
	node_id,
}: CreateDevResourcesRequest): CreateDevResourcesRequest => {
	return {
		name,
		url,
		node_id,
		file_key,
	};
};
