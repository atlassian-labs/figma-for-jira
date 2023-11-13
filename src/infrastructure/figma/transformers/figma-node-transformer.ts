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
	const { node, extra } = getNodeDataFrom(fileResponse, nodeId);
	const fileName = fileResponse.name;

	return {
		id: designId.toAtlassianDesignId(),
		displayName: `${fileName} - ${node.name}`,
		url: buildDesignUrl({ fileKey, fileName, nodeId }),
		liveEmbedUrl: buildLiveEmbedUrl({ fileKey, fileName, nodeId }),
		inspectUrl: buildInspectUrl({ fileKey, fileName, nodeId }),
		status: extra.devStatus
			? mapNodeStatusToDevStatus(extra.devStatus)
			: AtlassianDesignStatus.NONE,
		type: mapNodeTypeToDesignType(node.type),
		lastUpdated: extra.lastModified,
		updateSequenceNumber: getUpdateSequenceNumberFrom(extra.lastModified),
	};
};

type NodeData = {
	readonly node: Node;
	/**
	 * Contains relevant data that can be not available in the target node
	 * but can be resolved using other nodes in the tree (e.g., ancestor nodes).
	 */
	readonly extra: {
		readonly lastModified: string;
		readonly devStatus?: NodeDevStatus;
	};
};

/**
 * Returns a node with the given ID and related information extracted from ancestor nodes:
 *
 * - `lastModified`. Currently, Figma provides this field only for File and top-level nodes. Therefore, use
 * `lastModified` of the target node, its closest ancestor or a File respectively as the most accurate value for the node.
 *
 * @remarks
 * The function uses depth-first search (DFS) for find a node in `fileResponse` (which contains a tree of nodes).
 * For better performance, fetch {@link GetFileResponse} with only required nodes -- avoid fetching and traversing the whole
 * file.
 *
 * @internal
 * Visible for testing only.
 */
export const getNodeDataFrom = (
	fileResponse: GetFileResponse,
	nodeId: string,
): NodeData => {
	const result = findNodeDataUsingDfs(nodeId, fileResponse.document, {
		lastModified: fileResponse.lastModified,
	});

	if (result == null) {
		throw new Error('Response does not contain the node with the given ID.');
	}

	return result;
};

const findNodeDataUsingDfs = (
	targetNodeId: string,
	currentNode: Node,
	extra: NodeData['extra'],
): NodeData | null => {
	if (currentNode.lastModified) {
		extra = { ...extra, lastModified: currentNode.lastModified };
	}

	if (currentNode.devStatus) {
		extra = { ...extra, devStatus: currentNode.devStatus };
	}

	if (currentNode.id === targetNodeId) {
		return { node: currentNode, extra };
	}

	if (!currentNode.children?.length) return null;

	for (const childNode of currentNode.children) {
		const result = findNodeDataUsingDfs(targetNodeId, childNode, extra);

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
