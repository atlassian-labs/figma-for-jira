import { DEFAULT_FIGMA_FILE_NODE_ID } from './figma-service';
import {
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
	extractDataFromFigmaUrl,
	mapNodeStatusToDevStatus,
	mapNodeTypeToDesignType,
	transformFileToAtlassianDesign,
	transformNodeToAtlassianDesign,
} from './figma-transformer';
import {
	generateGetFileNodesResponse,
	generateGetFileResponse,
	MOCK_DESIGN_URL_WITH_NODE,
	MOCK_DESIGN_URL_WITHOUT_NODE,
	MOCK_FILE_KEY,
	MOCK_FILE_NAME,
	MOCK_INVALID_DESIGN_URL,
	MOCK_NODE_ID,
	MOCK_NODE_ID_URL,
} from './testing';

import * as configModule from '../../config';
import { mockConfig } from '../../config/testing';
import type { AtlassianDesign } from '../../domain/entities';
import {
	AtlassianDesignStatus,
	AtlassianDesignType,
} from '../../domain/entities';

jest.mock('../../config', () => {
	return {
		...jest.requireActual('../../config'),
		getConfig: jest.fn(),
	};
});

describe('FigmaTransformer', () => {
	beforeEach(() => {
		(configModule.getConfig as jest.Mock).mockReturnValue(mockConfig);
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});
	describe('extractDataFromFigmaUrl', () => {
		it('should return only fileKey if node_id is not provided in the url', () => {
			expect(
				extractDataFromFigmaUrl(MOCK_DESIGN_URL_WITHOUT_NODE),
			).toStrictEqual({
				fileKey: MOCK_FILE_KEY,
			});
		});
		it('should return fileKey and nodeId if both fileKey and nodeId are present in the url', () => {
			expect(extractDataFromFigmaUrl(MOCK_DESIGN_URL_WITH_NODE)).toStrictEqual({
				fileKey: MOCK_FILE_KEY,
				nodeId: MOCK_NODE_ID,
			});
		});
		it('should return null for an invalid url', () => {
			expect(extractDataFromFigmaUrl(MOCK_INVALID_DESIGN_URL)).toStrictEqual(
				null,
			);
		});
	});

	describe('buildLiveEmbedUrl', () => {
		it('should return a correctly formatted url', () => {
			const expected = new URL('https://www.figma.com/embed');
			expected.searchParams.append('embed_host', 'atlassian');
			expected.searchParams.append('url', MOCK_DESIGN_URL_WITH_NODE);
			expect(
				buildLiveEmbedUrl({
					fileKey: MOCK_FILE_KEY,
					fileName: MOCK_FILE_NAME,
					nodeId: MOCK_NODE_ID_URL,
				}),
			).toEqual(expected.toString());
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

	describe('transformNodeToAtlassianDesign', () => {
		it('should correctly map to atlassian design', () => {
			const mockApiResponse = generateGetFileNodesResponse({
				nodeId: MOCK_NODE_ID,
			});
			const expected: AtlassianDesign = {
				id: `${MOCK_FILE_KEY}/${MOCK_NODE_ID}`,
				displayName: mockApiResponse.nodes[MOCK_NODE_ID].document.name,
				url: buildDesignUrl({
					fileKey: MOCK_FILE_KEY,
					fileName: MOCK_FILE_NAME,
					nodeId: MOCK_NODE_ID,
				}),
				liveEmbedUrl: buildLiveEmbedUrl({
					fileKey: MOCK_FILE_KEY,
					fileName: MOCK_FILE_NAME,
					nodeId: MOCK_NODE_ID,
				}),
				inspectUrl: buildInspectUrl({
					fileKey: MOCK_FILE_KEY,
					fileName: MOCK_FILE_NAME,
					nodeId: MOCK_NODE_ID,
				}),
				status: AtlassianDesignStatus.NONE,
				type: AtlassianDesignType.NODE,
				lastUpdated: expect.anything(),
				updateSequenceNumber: parseInt(mockApiResponse.version, 10),
			};

			const result = transformNodeToAtlassianDesign({
				fileKey: MOCK_FILE_KEY,
				nodeId: MOCK_NODE_ID,
				fileNodesResponse: mockApiResponse,
			});

			expect(result).toStrictEqual(expected);
		});
	});

	describe('transformFileToAtlassianDesign', () => {
		it('should correctly map to atlassian design', () => {
			const mockApiResponse = generateGetFileResponse();
			const expected: AtlassianDesign = {
				id: `${MOCK_FILE_KEY}/${DEFAULT_FIGMA_FILE_NODE_ID}`,
				displayName: mockApiResponse.name,
				url: buildDesignUrl({
					fileKey: MOCK_FILE_KEY,
					fileName: MOCK_FILE_NAME,
				}),
				liveEmbedUrl: buildLiveEmbedUrl({
					fileKey: MOCK_FILE_KEY,
					fileName: MOCK_FILE_NAME,
				}),
				inspectUrl: buildInspectUrl({
					fileKey: MOCK_FILE_KEY,
					fileName: MOCK_FILE_NAME,
				}),
				status: AtlassianDesignStatus.NONE,
				type: AtlassianDesignType.FILE,
				lastUpdated: expect.anything(),
				updateSequenceNumber: parseInt(mockApiResponse.version, 10),
			};

			const result = transformFileToAtlassianDesign({
				fileKey: MOCK_FILE_KEY,
				fileResponse: mockApiResponse,
			});

			expect(result).toStrictEqual(expected);
		});
	});
});
