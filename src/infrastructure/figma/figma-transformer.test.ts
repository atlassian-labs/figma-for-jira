import {
	buildInspectUrl,
	buildLiveEmbedUrl,
	extractDataFromFigmaUrl,
	mapNodeStatusToDevStatus,
	mapNodeTypeToDesignType,
	transformFileToAtlassianDesign,
	transformNodeToAtlassianDesign,
} from './figma-transformer';
import {
	DESIGN_URL_WITH_NODE,
	DESIGN_URL_WITHOUT_NODE,
	generateGetFileNodesResponse,
	generateGetFileResponse,
	INVALID_DESIGN_URL,
	MOCK_FILE_KEY,
	MOCK_NODE_ID,
	MOCK_NODE_ID_URL,
	MOCK_VALID_ASSOCIATION,
	PROTOTYPE_URL,
} from './testing';

import { ISSUE_ASSOCIATED_DESIGN_RELATIONSHIP_TYPE } from '../../common/constants';
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
		it('should return only fileKey and isPrototype if node_id is not provided in the url', () => {
			expect(extractDataFromFigmaUrl(DESIGN_URL_WITHOUT_NODE)).toStrictEqual({
				fileKey: MOCK_FILE_KEY,
				isPrototype: false,
			});
		});
		it('should return fileKey, nodeId and isPrototype if both fileKey and nodeId are present in the url', () => {
			expect(extractDataFromFigmaUrl(DESIGN_URL_WITH_NODE)).toStrictEqual({
				fileKey: MOCK_FILE_KEY,
				nodeId: MOCK_NODE_ID_URL,
				isPrototype: false,
			});
		});
		it('should return `isPrototype: true` if the url is for a prototype', () => {
			expect(extractDataFromFigmaUrl(PROTOTYPE_URL)).toStrictEqual({
				fileKey: MOCK_FILE_KEY,
				nodeId: MOCK_NODE_ID_URL,
				isPrototype: true,
			});
		});
		it('should return null for an invalid url', () => {
			expect(extractDataFromFigmaUrl(INVALID_DESIGN_URL)).toStrictEqual(null);
		});
	});

	describe('buildLiveEmbedUrl', () => {
		it('should return a correctly formatted url', () => {
			expect(buildLiveEmbedUrl(DESIGN_URL_WITH_NODE)).toStrictEqual(
				`https://www.figma.com/embed?embed_host=atlassian&url=${encodeURIComponent(
					DESIGN_URL_WITH_NODE,
				)}`,
			);
		});
		it('should throw for an invalid url', () => {
			expect(() => {
				buildLiveEmbedUrl('https://www.notfigma.com');
			}).toThrow();
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
			[AtlassianDesignType.PROTOTYPE, 'FRAME', true],
			[AtlassianDesignType.FILE, 'DOCUMENT', false],
			[AtlassianDesignType.CANVAS, 'CANVAS', false],
			[AtlassianDesignType.GROUP, 'SECTION', false],
			[AtlassianDesignType.GROUP, 'GROUP', false],
			[AtlassianDesignType.NODE, 'FRAME', false],
			[AtlassianDesignType.OTHER, 'SOMETHINGELSE', false],
		])(
			'should return %s if Figma type is %s and isPrototype is %s',
			(expected, type, isPrototype) => {
				expect(mapNodeTypeToDesignType(type, isPrototype)).toEqual(expected);
			},
		);
	});

	describe('transformNodeToAtlassianDesign', () => {
		it('should correctly map to atlassian design', () => {
			const mockApiResponse = generateGetFileNodesResponse({
				nodeId: MOCK_NODE_ID,
			});
			const expected: AtlassianDesign = {
				id: MOCK_NODE_ID,
				displayName: mockApiResponse.nodes[MOCK_NODE_ID].document.name,
				url: DESIGN_URL_WITH_NODE,
				liveEmbedUrl: buildLiveEmbedUrl(DESIGN_URL_WITH_NODE),
				inspectUrl: buildInspectUrl(DESIGN_URL_WITH_NODE),
				status: AtlassianDesignStatus.NONE,
				type: AtlassianDesignType.NODE,
				lastUpdated: expect.anything(),
				updateSequenceNumber: parseInt(mockApiResponse.version, 10),
				addAssociations: [
					{
						associationType: ISSUE_ASSOCIATED_DESIGN_RELATIONSHIP_TYPE,
						values: [MOCK_VALID_ASSOCIATION.ari],
					},
				],
				removeAssociations: [],
			};

			const result = transformNodeToAtlassianDesign({
				nodeId: MOCK_NODE_ID,
				url: DESIGN_URL_WITH_NODE,
				isPrototype: false,
				associateWith: MOCK_VALID_ASSOCIATION,
				fileNodesResponse: mockApiResponse,
			});

			expect(result).toStrictEqual(expected);
		});
	});

	describe('transformFileToAtlassianDesign', () => {
		it('should correctly map to atlassian design', () => {
			const mockApiResponse = generateGetFileResponse();
			const expected: AtlassianDesign = {
				id: MOCK_FILE_KEY,
				displayName: mockApiResponse.name,
				url: DESIGN_URL_WITHOUT_NODE,
				liveEmbedUrl: buildLiveEmbedUrl(DESIGN_URL_WITHOUT_NODE),
				inspectUrl: buildInspectUrl(DESIGN_URL_WITHOUT_NODE),
				status: AtlassianDesignStatus.NONE,
				type: AtlassianDesignType.FILE,
				lastUpdated: expect.anything(),
				updateSequenceNumber: parseInt(mockApiResponse.version, 10),
				addAssociations: [
					{
						associationType: ISSUE_ASSOCIATED_DESIGN_RELATIONSHIP_TYPE,
						values: [MOCK_VALID_ASSOCIATION.ari],
					},
				],
				removeAssociations: [],
			};

			const result = transformFileToAtlassianDesign({
				url: DESIGN_URL_WITHOUT_NODE,
				fileKey: MOCK_FILE_KEY,
				isPrototype: false,
				associateWith: MOCK_VALID_ASSOCIATION,
				fileResponse: mockApiResponse,
			});

			expect(result).toStrictEqual(expected);
		});
	});
});
