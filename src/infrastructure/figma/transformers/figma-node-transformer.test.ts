import {
	findNodeDataInFile,
	mapNodeStatusToDevStatus,
	mapNodeTypeToDesignType,
	transformNodeToAtlassianDesign,
	tryTransformNodeToAtlassianDesign,
} from './figma-node-transformer';
import {
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
	getUpdateSequenceNumberFrom,
} from './utils';

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

	it('should throw error if node is not found', () => {
		const fileKey = generateFigmaFileKey();
		const fileResponse = generateGetFileResponse({
			document: {
				...MOCK_DOCUMENT,
			},
		});

		expect(() =>
			transformNodeToAtlassianDesign({
				fileKey,
				nodeId: '100:1',
				fileResponse,
			}),
		).toThrow();
	});
});

describe('tryTransformNodeToAtlassianDesign', () => {
	beforeEach(() => {
		(configModule.getConfig as jest.Mock).mockReturnValue(mockConfig);
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should correctly map to atlassian design', () => {
		const fileKey = generateFigmaFileKey();
		const node = generateChildNode({ id: '100:1' });
		const nodeLastModified = new Date('2023-11-05T23:08:49.123Z');
		const irrelevantLastModified = new Date('2023-11-05T23:10:00.123Z');
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

		const result = tryTransformNodeToAtlassianDesign({
			fileKey,
			nodeId: node.id,
			fileResponse,
		});

		expect(result).toStrictEqual({
			id: `${fileKey}/${node.id}`,
			displayName: `${fileResponse.name} - ${node.name}`,
			url: buildDesignUrl({
				fileKey,
				nodeId: node.id,
			}),
			liveEmbedUrl: buildLiveEmbedUrl({
				fileKey,
				nodeId: node.id,
			}),
			inspectUrl: buildInspectUrl({
				fileKey,
				nodeId: node.id,
			}),
			status: AtlassianDesignStatus.NONE,
			type: AtlassianDesignType.OTHER,
			lastUpdated: nodeLastModified.toISOString(),
			updateSequenceNumber: getUpdateSequenceNumberFrom(
				nodeLastModified.toISOString(),
			),
		});
	});

	it('should return null if node is not found', () => {
		const fileKey = generateFigmaFileKey();
		const fileResponse = generateGetFileResponse({
			document: {
				...MOCK_DOCUMENT,
			},
		});

		const result = tryTransformNodeToAtlassianDesign({
			fileKey,
			nodeId: '100:1',
			fileResponse,
		});

		expect(result).toBeNull();
	});
});

describe('findNodeDataInFile', () => {
	it('should return node with its lastModified if node has lastModified', () => {
		const irrelevantLastModified = new Date('2023-06-15T00:00:00Z');
		const targetNode = generateFrameNode({
			id: '100:1',
			lastModified: new Date('2022-01-01T00:00:00Z'),
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
					targetNode,
				],
			},
			lastModified: irrelevantLastModified,
		});

		const result = findNodeDataInFile(fileResponse, targetNode.id);

		expect(result).toStrictEqual({
			node: targetNode,
			extra: {
				lastModified: targetNode.lastModified,
			},
		});
	});

	it('should return node with ancestor lastModified if node does not have lastModified', () => {
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

		const result = findNodeDataInFile(fileResponse, targetNode.id);

		expect(result).toStrictEqual({
			node: targetNode,
			extra: {
				lastModified: targetLastModified.toISOString(),
			},
		});
	});

	it('should return node with file lastModified if no node contains lastModified', () => {
		const targetNode = generateChildNode({ id: '100:1' });
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
		});

		const result = findNodeDataInFile(fileResponse, targetNode.id);

		expect(result).toStrictEqual({
			node: targetNode,
			extra: {
				lastModified: fileResponse.lastModified,
			},
		});
	});

	it('should return node with its devStatus if node has devStatus', () => {
		const targetNode = generateFrameNode({
			id: '100:1',
			devStatus: { type: 'READY_FOR_DEV' },
			lastModified: new Date('2022-01-01T00:00:00Z'),
			children: [generateChildNode({ id: '2:3' })],
		});

		const fileResponse = generateGetFileResponse({
			document: {
				...MOCK_DOCUMENT,
				children: [
					generateFrameNode({
						id: '1:1',
						devStatus: undefined,
						children: [
							generateChildNode({ id: '2:1' }),
							generateChildNode({ id: '2:2' }),
						],
					}),
					targetNode,
				],
			},
		});

		const result = findNodeDataInFile(fileResponse, targetNode.id);

		expect(result).toStrictEqual({
			node: targetNode,
			extra: {
				devStatus: targetNode.devStatus,
				lastModified: targetNode.lastModified,
			},
		});
	});

	it('should return node with ancestor status if node does not have status', () => {
		const targetNode = generateChildNode({ id: '100:1' });
		const expectedStatus = { type: 'READY_FOR_DEV' };
		const expectedLastModified = new Date('2023-06-15T00:00:00Z');

		const fileResponse = generateGetFileResponse({
			document: {
				...MOCK_DOCUMENT,
				children: [
					generateFrameNode({
						id: '1:1',
						children: [
							generateChildNode({ id: '2:1' }),
							generateChildNode({ id: '2:2' }),
						],
					}),
					generateFrameNode({
						id: '1:2',
						devStatus: expectedStatus,
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
			lastModified: expectedLastModified,
		});

		const result = findNodeDataInFile(fileResponse, targetNode.id);

		expect(result).toStrictEqual({
			node: targetNode,
			extra: {
				devStatus: expectedStatus,
				lastModified: expectedLastModified.toISOString(),
			},
		});
	});

	it('should return node with no file status if no node contains status', () => {
		const targetNode = generateChildNode({ id: '100:1' });
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
		});

		const result = findNodeDataInFile(fileResponse, targetNode.id);

		expect(result).toStrictEqual({
			node: targetNode,
			extra: {
				lastModified: fileResponse.lastModified,
			},
		});
	});

	it('should return null node is not found', () => {
		const targetNode = generateChildNode();
		const fileResponse = generateGetFileResponse({
			document: {
				...MOCK_DOCUMENT,
				children: [],
			},
		});

		const result = findNodeDataInFile(fileResponse, targetNode.id);

		expect(result).toBeNull();
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
