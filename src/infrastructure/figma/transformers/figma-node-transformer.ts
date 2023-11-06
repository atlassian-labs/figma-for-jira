import {
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
	getUpdateSequenceNumberFrom,
} from './utils';

import type { AtlassianDesign } from '../../../domain/entities';
import {
	AtlassianDesignStatus,
	AtlassianDesignType,
	FigmaDesignIdentifier,
} from '../../../domain/entities';
import type { GetFileResponse, Node, NodeDevStatus } from '../figma-client';

type TransformNodeToAtlassianDesignParams = {
	readonly fileKey: string;
	readonly nodeId: string;
	readonly fileResponse: GetFileResponse;
};

/**
 * Transforms a Figma node with the given ID to {@link AtlassianDesign}.
 */
export const transformNodeToAtlassianDesign = ({
	fileKey,
	nodeId,
	fileResponse,
}: TransformNodeToAtlassianDesignParams): AtlassianDesign => {
	const designId = new FigmaDesignIdentifier(fileKey, nodeId);
	const { node, nodeLastModified } = getNodeAndNodeLastModified(
		fileResponse,
		nodeId,
	);
	const fileName = fileResponse.name;

	return {
		id: designId.toAtlassianDesignId(),
		displayName: `${fileName} - ${node.name}`,
		url: buildDesignUrl({ fileKey, fileName, nodeId }),
		liveEmbedUrl: buildLiveEmbedUrl({ fileKey, fileName, nodeId }),
		inspectUrl: buildInspectUrl({ fileKey, fileName, nodeId }),
		status: node.devStatus
			? mapNodeStatusToDevStatus(node.devStatus)
			: AtlassianDesignStatus.NONE,
		type: mapNodeTypeToDesignType(node.type),
		lastUpdated: nodeLastModified,
		updateSequenceNumber: getUpdateSequenceNumberFrom(nodeLastModified),
	};
};

/**
 * Returns a node with the given ID and a date when it was modified.
 *
 * Figma API does not provide `lastModified` for each node but only for top-level nodes.
 * Therefore, the function uses `lastModified` of the corresponding root node as the most accurate value
 * for the node.
 *
 * @remarks
 * The function uses depth-first search (DFS) for find a node in `fileResponse` (which contains a tree of nodes).
 * For better performance, fetch {@link GetFileResponse} with only required nodes -- avoid fetching and traversing the whole
 * file.
 *
 * @internal
 * Visible for testing only.
 */
export const getNodeAndNodeLastModified = (
	fileResponse: GetFileResponse,
	nodeId: string,
): { node: Node; nodeLastModified: string } => {
	const result = findNodeAndNodeLastModifiedUsingDfs(
		fileResponse.document,
		nodeId,
		fileResponse.lastModified,
	);

	if (result == null) {
		throw new Error('Response does not contain the node with the given ID.');
	}

	return result;
};

const findNodeAndNodeLastModifiedUsingDfs = (
	currentNode: Node,
	targetNodeId: string,
	targetNodeLastModified: string,
): { node: Node; nodeLastModified: string } | null => {
	if (currentNode.lastModified) {
		targetNodeLastModified = currentNode.lastModified;
	}

	if (currentNode.id === targetNodeId) {
		return { node: currentNode, nodeLastModified: targetNodeLastModified };
	}

	for (const childNode of currentNode.children ?? []) {
		const result = findNodeAndNodeLastModifiedUsingDfs(
			childNode,
			targetNodeId,
			targetNodeLastModified,
		);

		if (result) return result;
	}

	return null;
};

/**
 * Maps a Figma devStatus to an Atlassian Design entity status.
 * @see SECTION on https://www.figma.com/developers/api#node-types
 *
 * @internal
 * Visible for testing only.
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
 *
 * @internal
 * Visible for testing only.
 */
export const mapNodeTypeToDesignType = (type: string): AtlassianDesignType => {
	switch (type) {
		case 'DOCUMENT':
			return AtlassianDesignType.FILE;
		case 'CANVAS':
			return AtlassianDesignType.CANVAS;
		case 'SECTION':
			return AtlassianDesignType.GROUP;
		case 'GROUP':
			return AtlassianDesignType.GROUP;
		case 'FRAME':
			return AtlassianDesignType.NODE;
		default:
			return AtlassianDesignType.OTHER;
	}
};
