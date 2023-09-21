import {
	getNodeAndNodeLastModified,
	mapNodeStatusToDevStatus,
	mapNodeTypeToDesignType,
	transformNodeToAtlassianDesign,
} from './figma-node-transformer';
import { buildDesignUrl, buildInspectUrl, buildLiveEmbedUrl } from './utils';

import * as configModule from '../../../config';
import { mockConfig } from '../../../config/testing';
import {
	AtlassianDesignStatus,
	AtlassianDesignType,
} from '../../../domain/entities';
import { generateFigmaFileKey } from '../../../domain/entities/testing';
import {
	generateChildNode,
	generateFrameNode,
	generateGetFileResponse,
	MOCK_DOCUMENT,
} from '../figma-client/testing';

jest.mock('../../../config', () => {
	return {
		...jest.requireActual('../../../config'),
		getConfig: jest.fn(),
	};
});

describe('transformNodeToAtlassianDesign', () => {
	beforeEach(() => {
		(configModule.getConfig as jest.Mock).mockReturnValue(mockConfig);
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should correctly map to atlassian design', () => {
		const fileKey = generateFigmaFileKey();
		const node = generateChildNode({ id: '100:1' });
		const nodeLastModified = new Date('2022-01-01T00:00:00Z');
		const irrelevantLastModified = new Date('2023-06-15T00:00:00Z');
		const fileResponse = generateGetFileResponse({
			document: {
				...MOCK_DOCUMENT,
				children: [
					generateFrameNode({
						id: '1:1',
						lastModified: irrelevantLastModified,
						children: [
							generateChildNode({ id: '2:1' }),
							generateChildNode({ id: '2:2' }),
						],
					}),
					generateFrameNode({
						id: '1:2',
						lastModified: nodeLastModified,
						children: [generateChildNode({ id: '2:3' }), node],
					}),
				],
			},
			lastModified: irrelevantLastModified,
		});

		const result = transformNodeToAtlassianDesign({
			fileKey,
			nodeId: node.id,
			fileResponse,
		});

		expect(result).toStrictEqual({
			id: `${fileKey}/${node.id}`,
			displayName: node.name,
			url: buildDesignUrl({
				fileKey,
				fileName: fileResponse.name,
				nodeId: node.id,
			}),
			liveEmbedUrl: buildLiveEmbedUrl({
				fileKey,
				fileName: fileResponse.name,
				nodeId: node.id,
			}),
			inspectUrl: buildInspectUrl({
				fileKey,
				fileName: fileResponse.name,
				nodeId: node.id,
			}),
			status: AtlassianDesignStatus.NONE,
			type: AtlassianDesignType.OTHER,
			lastUpdated: nodeLastModified.toISOString(),
			updateSequenceNumber: nodeLastModified.getTime(),
		});
	});
});

describe('getNodeAndNodeLastModified', () => {
	it('should return node and file lastModified if nodes do not contain lastModified', () => {
		const targetNode = generateChildNode({ id: '100:1' });
		const targetLastModified = new Date();
		const fileResponse = generateGetFileResponse({
			document: {
				...MOCK_DOCUMENT,
				children: [
					generateFrameNode({
						id: '1:2',
						children: [targetNode],
					}),
				],
			},
			lastModified: targetLastModified,
		});

		const result = getNodeAndNodeLastModified(fileResponse, targetNode.id);

		expect(result).toStrictEqual({
			node: targetNode,
			nodeLastModified: targetLastModified,
		});
	});

	it('should return node and node lastModified if node has lastModified', () => {
		const irrelevantLastModified = new Date('2023-06-15T00:00:00Z');
		const targetLastModified = new Date('2022-01-01T00:00:00Z');
		const targetFrame = generateFrameNode({
			id: '100:1',
			lastModified: targetLastModified,
			children: [generateChildNode({ id: '2:3' })],
		});
		const fileResponse = generateGetFileResponse({
			document: {
				...MOCK_DOCUMENT,
				children: [
					generateFrameNode({
						id: '1:1',
						lastModified: irrelevantLastModified,
						children: [
							generateChildNode({ id: '2:1' }),
							generateChildNode({ id: '2:2' }),
						],
					}),
					targetFrame,
				],
			},
			lastModified: irrelevantLastModified,
		});

		const result = getNodeAndNodeLastModified(fileResponse, targetFrame.id);

		expect(result).toStrictEqual({
			node: targetFrame,
			nodeLastModified: targetLastModified,
		});
	});

	it('should return node and lastModified of nearest parent with lastModified if node does not have lastModified', () => {
		const targetNode = generateChildNode({ id: '100:1' });
		const targetLastModified = new Date('2022-01-01T00:00:00Z');
		const irrelevantLastModified = new Date('2023-06-15T00:00:00Z');
		const fileResponse = generateGetFileResponse({
			document: {
				...MOCK_DOCUMENT,
				children: [
					generateFrameNode({
						id: '1:1',
						lastModified: irrelevantLastModified,
						children: [
							generateChildNode({ id: '2:1' }),
							generateChildNode({ id: '2:2' }),
						],
					}),
					generateFrameNode({
						id: '1:2',
						lastModified: targetLastModified,
						children: [
							generateChildNode({ id: '2:3' }),
							generateFrameNode({
								id: '1:1',
								children: [generateChildNode({ id: '3:1' }), targetNode],
							}),
						],
					}),
				],
			},
			lastModified: irrelevantLastModified,
		});

		const result = getNodeAndNodeLastModified(fileResponse, targetNode.id);

		expect(result).toStrictEqual({
			node: targetNode,
			nodeLastModified: targetLastModified,
		});
	});

	it('should throw if node is not found', () => {
		const targetNode = generateChildNode();
		const fileResponse = generateGetFileResponse({
			document: {
				...MOCK_DOCUMENT,
				children: [],
			},
		});

		expect(() =>
			getNodeAndNodeLastModified(fileResponse, targetNode.id),
		).toThrow();
	});
});

describe('mapNodeStatusToDevStatus', () => {
	it('should return "READY_FOR_DEVELOPMENT" if Figma status is "READY_FOR_DEV"', () => {
		expect(mapNodeStatusToDevStatus({ type: 'READY_FOR_DEV' })).toEqual(
			AtlassianDesignStatus.READY_FOR_DEVELOPMENT,
		);
	});
	it('should return "UNKNOWN" for any other status', () => {
		expect(mapNodeStatusToDevStatus({ type: 'OTHER_STATUS' })).toEqual(
			AtlassianDesignStatus.UNKNOWN,
		);
	});
});

describe('mapNodeTypeToDesignType', () => {
	it.each([
		[AtlassianDesignType.FILE, 'DOCUMENT'],
		[AtlassianDesignType.CANVAS, 'CANVAS'],
		[AtlassianDesignType.GROUP, 'SECTION'],
		[AtlassianDesignType.GROUP, 'GROUP'],
		[AtlassianDesignType.NODE, 'FRAME'],
		[AtlassianDesignType.OTHER, 'SOMETHING_ELSE'],
	])('should return %s if Figma type is %s', (expected, type) => {
		expect(mapNodeTypeToDesignType(type)).toEqual(expected);
	});
});
