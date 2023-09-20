import {
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
	getUpdateSequenceNumber,
} from './utils';

import type { AtlassianDesign } from '../../../domain/entities';
import {
	AtlassianDesignStatus,
	AtlassianDesignType,
	FigmaDesignIdentifier,
} from '../../../domain/entities';
import type { FileResponse, Node, NodeDevStatus } from '../figma-client';

type TransformNodeToAtlassianDesignParams = {
	readonly fileKey: string;
	readonly nodeId: string;
	readonly fileResponseWithNode: FileResponse;
};

export const transformNodeToAtlassianDesign = ({
	fileKey,
	nodeId,
	fileResponseWithNode,
}: TransformNodeToAtlassianDesignParams): AtlassianDesign => {
	const designId = new FigmaDesignIdentifier(fileKey, nodeId);
	const node = findNode(fileResponseWithNode, nodeId);
	const fileName = fileResponseWithNode.name;
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
		lastUpdated: fileResponseWithNode.lastModified,
		updateSequenceNumber: getUpdateSequenceNumber(fileResponseWithNode.version),
	};
};

const findNode = (fileResponseWithNode: FileResponse, nodeId: string): Node => {
	let targetNode = fileResponseWithNode.document;

	while (targetNode.children?.length) {
		if (targetNode.children.length > 1)
			throw new Error(
				'The response should include only nodes between the root node and the node with the given ID.',
			);
		targetNode = targetNode.children[0];
	}

	if (targetNode.id !== nodeId)
		throw new Error('Response does not contain the node with the given ID.');

	return targetNode;
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
