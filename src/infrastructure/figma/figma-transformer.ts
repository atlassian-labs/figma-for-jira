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
	FigmaDesignIdentity,
} from '../../domain/entities';

/**
 * Builds a URL to a Figma design given Figma file/node metadata.
 */
export const buildDesignUrl = ({
	fileKey,
	fileName,
	nodeId,
}: {
	fileKey: string;
	fileName: string;
	nodeId?: string;
}): string => {
	const url = new URL(
		`${getConfig().figma.webBaseUrl}/file/${fileKey}/${fileName}`,
	);
	if (nodeId) {
		url.searchParams.append('node-id', nodeId);
	}
	return url.toString();
};

/**
 * Builds a Live Embed URL to a Figma design given Figma file/node metadata.
 * Inspect URL is used as this is the preferred mode of display in Jira.
 * @see https://www.figma.com/developers/embed
 */
export const buildLiveEmbedUrl = ({
	fileKey,
	fileName,
	nodeId,
}: {
	fileKey: string;
	fileName: string;
	nodeId?: string;
}): string => {
	const inspectUrl = buildInspectUrl({ fileKey, fileName, nodeId });
	const url = new URL(`${getConfig().figma.webBaseUrl}/embed`);
	url.searchParams.append('embed_host', 'atlassian');
	url.searchParams.append('url', inspectUrl);
	return url.toString();
};

/**
 * Builds an Inspect Mode URL to a Figma design given Figma file/node metadata.
 */
export const buildInspectUrl = ({
	fileKey,
	fileName,
	nodeId,
}: {
	fileKey: string;
	fileName: string;
	nodeId?: string;
}): string => {
	const url = new URL(
		`${getConfig().figma.webBaseUrl}/file/${fileKey}/${fileName}`,
	);
	if (nodeId) {
		url.searchParams.append('node-id', nodeId);
	}
	url.searchParams.set('mode', 'dev');
	return url.toString();
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
export const mapNodeTypeToDesignType = (type: string): AtlassianDesignType => {
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
	readonly fileKey: string;
	readonly nodeId: string;
	readonly fileNodesResponse: FileNodesResponse;
};

export const transformNodeToAtlassianDesign = ({
	fileKey,
	nodeId,
	fileNodesResponse,
}: TransformNodeToAtlassianDesignParams): AtlassianDesign => {
	const designId = new FigmaDesignIdentity(fileKey, nodeId);
	const node = fileNodesResponse.nodes[nodeId].document;
	const fileName = fileNodesResponse.name;
	return {
		id: designId.toAtlassianDesignId(),
		displayName: node.name,
		url: buildDesignUrl({ fileKey, fileName, nodeId }),
		liveEmbedUrl: buildLiveEmbedUrl({ fileKey, fileName, nodeId }),
		inspectUrl: buildInspectUrl({ fileKey, fileName, nodeId }),
		status: node.devStatus
			? mapNodeStatusToDevStatus(node.devStatus)
			: AtlassianDesignStatus.NONE,
		type: mapNodeTypeToDesignType(node.type),
		// TODO: lastUpdated should be determined by the nearest parent node's lastModified time once Figma have implemented lastModified
		lastUpdated: fileNodesResponse.lastModified,
		updateSequenceNumber: getUpdateSequenceNumber(fileNodesResponse.version),
	};
};

type TransformFileToAtlassianDesignParams = {
	readonly fileKey: string;
	readonly fileResponse: FileResponse;
};

export const transformFileToAtlassianDesign = ({
	fileKey,
	fileResponse,
}: TransformFileToAtlassianDesignParams): AtlassianDesign => {
	const designId = new FigmaDesignIdentity(fileKey);
	const fileName = fileResponse.name;
	return {
		id: designId.toAtlassianDesignId(),
		displayName: fileResponse.name,
		url: buildDesignUrl({ fileKey, fileName }),
		liveEmbedUrl: buildLiveEmbedUrl({ fileKey, fileName }),
		inspectUrl: buildInspectUrl({ fileKey, fileName }),
		status: AtlassianDesignStatus.NONE,
		type: AtlassianDesignType.FILE,
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
