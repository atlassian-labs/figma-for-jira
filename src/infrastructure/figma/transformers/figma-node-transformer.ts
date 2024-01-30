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
	readonly prevDevStatus?: AtlassianDesignStatus;
	readonly prevLastUpdated?: string;
};

/**
 * Returns a {@link AtlassianDesign} for the Node with the given ID if it is available in the File;
 * otherwise -- throws an exception.
 *
 * @remarks
 * Use with cautious since there is guarantee that Node is available in {@link GetFileResponse}
 * Consider using {@link tryTransformNodeToAtlassianDesign} instead.
 */
export const transformNodeToAtlassianDesign = ({
	fileKey,
	nodeId,
	fileResponse,
}: TransformNodeToAtlassianDesignParams): AtlassianDesign => {
	const result = tryTransformNodeToAtlassianDesign({
		fileKey,
		nodeId,
		fileResponse,
	});

	if (result === null) throw new Error('Node is not found in the given File.');

	return result;
};

const getLastUpdatedTimeForNode = ({
	newDevStatus,
	nodeLastModified,
	fileLastModified,
	prevDevStatus,
	prevLastUpdated,
}: {
	newDevStatus: AtlassianDesignStatus;
	nodeLastModified: string;
	fileLastModified: string;
	prevDevStatus: AtlassianDesignStatus;
	prevLastUpdated: string;
}): string => {
	if (newDevStatus !== prevDevStatus) {
		if (prevDevStatus === AtlassianDesignStatus.UNKNOWN) {
			// Use the existing lastModified time on the node if the cached devStatus
			// we have is UNKNOWN since we can't be certain that the file update
			// triggered the dev status to change
			return nodeLastModified;
		} else {
			// Use the lastModified time on the file if the devStatus changes.
			// Since any node changes cascade upwards, we can be certain that the
			// file.lastModified time > the node.lastModified time
			return fileLastModified;
		}
	} else {
		// If there has been no dev status change to the node, there are 2 cases we
		// need to consider:
		// - The node itself has changed without changing the dev status
		// - The node has not changed but we previously used the file last modified
		//   time when sending data to Jira
		// In either case, we just want to use whichever is the most recent timestamp
		if (
			getUpdateSequenceNumberFrom(prevLastUpdated) >
			getUpdateSequenceNumberFrom(nodeLastModified)
		) {
			return prevLastUpdated;
		} else {
			return nodeLastModified;
		}
	}
};

/**
 * Returns a {@link AtlassianDesign} for the Node with the given ID if it is available in the File;
 * otherwise -- `null`.
 */
export const tryTransformNodeToAtlassianDesign = ({
	fileKey,
	nodeId,
	fileResponse,
	prevDevStatus = AtlassianDesignStatus.UNKNOWN,
	prevLastUpdated = new Date(0).toISOString(),
}: TransformNodeToAtlassianDesignParams): AtlassianDesign | null => {
	const designId = new FigmaDesignIdentifier(fileKey, nodeId);
	const nodeData = findNodeDataInFile(fileResponse, nodeId);

	if (nodeData == null) return null;

	const { node, extra } = nodeData;
	const fileName = fileResponse.name;

	const devStatus = extra.devStatus
		? mapNodeStatusToDevStatus(extra.devStatus)
		: AtlassianDesignStatus.NONE;

	const lastUpdated = getLastUpdatedTimeForNode({
		newDevStatus: devStatus,
		nodeLastModified: extra.lastModified,
		fileLastModified: fileResponse.lastModified,
		prevDevStatus,
		prevLastUpdated,
	});

	return {
		id: designId.toAtlassianDesignId(),
		displayName: `${fileName} - ${node.name}`,
		url: buildDesignUrl({ fileKey, nodeId }).toString(),
		liveEmbedUrl: buildLiveEmbedUrl({ fileKey, nodeId }).toString(),
		inspectUrl: buildInspectUrl({ fileKey, nodeId }).toString(),
		status: devStatus,
		type: mapNodeTypeToDesignType(node.type),
		lastUpdated,
		updateSequenceNumber: getUpdateSequenceNumberFrom(lastUpdated),
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
 * Returns {@link NodeData} for the Node with given ID from the given {@link GetFileResponse} if it is available;
 * otherwise -- `null`.
 *
 * In addition to the `node` field, the returned result includes `extra`:
 * - `lastModified`. Currently, Figma provides this field only for File and top-level nodes. Therefore, use
 * `lastModified` of the target node, its closest ancestor or a File respectively as the most accurate value for the node.
 * - `devStatus`. Currently,  Figma provides this field only for some types of nodes (Section). Therefore, use `devStatus`
 * of the target node or its closest ancestor.
 *
 * @remarks
 * The function uses depth-first search (DFS) for find a node in `fileResponse` (which contains a tree of nodes).
 * For better performance, fetch {@link GetFileResponse} with only required nodes -- avoid fetching and traversing the whole
 * file.
 *
 * @internal
 * Visible for testing only.
 */
export const findNodeDataInFile = (
	fileResponse: GetFileResponse,
	nodeId: string,
): NodeData | null => {
	const result = findNodeDataInFileUsingDfs(nodeId, fileResponse.document, {
		lastModified: fileResponse.lastModified,
	});

	return result;
};

const findNodeDataInFileUsingDfs = (
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
		const result = findNodeDataInFileUsingDfs(targetNodeId, childNode, extra);

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
