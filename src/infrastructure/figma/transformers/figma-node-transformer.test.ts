import {
	mapNodeStatusToDevStatus,
	mapNodeTypeToDesignType,
	transformNodeToAtlassianDesign,
} from './figma-node-transformer';
import { buildDesignUrl, buildInspectUrl, buildLiveEmbedUrl } from './utils';

import * as configModule from '../../../config';
import { mockConfig } from '../../../config/testing';
import type { AtlassianDesign } from '../../../domain/entities';
import {
	AtlassianDesignStatus,
	AtlassianDesignType,
} from '../../../domain/entities';
import {
	generateGetFileResponseWithNode,
	MOCK_CHILD_NODE,
	MOCK_FILE_KEY,
	MOCK_FILE_NAME,
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
		const node = MOCK_CHILD_NODE;
		const mockApiResponse = generateGetFileResponseWithNode({
			node,
		});
		const expected: AtlassianDesign = {
			id: `${MOCK_FILE_KEY}/${node.id}`,
			displayName: node.name,
			url: buildDesignUrl({
				fileKey: MOCK_FILE_KEY,
				fileName: MOCK_FILE_NAME,
				nodeId: node.id,
			}),
			liveEmbedUrl: buildLiveEmbedUrl({
				fileKey: MOCK_FILE_KEY,
				fileName: MOCK_FILE_NAME,
				nodeId: node.id,
			}),
			inspectUrl: buildInspectUrl({
				fileKey: MOCK_FILE_KEY,
				fileName: MOCK_FILE_NAME,
				nodeId: node.id,
			}),
			status: AtlassianDesignStatus.NONE,
			type: AtlassianDesignType.OTHER,
			lastUpdated: expect.anything(),
			updateSequenceNumber: parseInt(mockApiResponse.version, 10),
		};

		const result = transformNodeToAtlassianDesign({
			fileKey: MOCK_FILE_KEY,
			nodeId: node.id,
			fileResponseWithNode: mockApiResponse,
		});

		expect(result).toStrictEqual(expected);
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
		[AtlassianDesignType.OTHER, 'SOMETHINGELSE'],
	])('should return %s if Figma type is %s', (expected, type) => {
		expect(mapNodeTypeToDesignType(type)).toEqual(expected);
	});
});
