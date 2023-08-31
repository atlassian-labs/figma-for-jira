import {
	buildInspectUrl,
	buildLiveEmbedUrl,
	extractDataFromFigmaUrl,
	mapNodeStatusToDevStatus,
	mapNodeTypeToDesignType,
	transformFileToDataDepotDesign,
	transformNodeToDataDepotDesign,
} from './figma-transformer';
import {
	DESIGN_URL_WITH_NODE,
	DESIGN_URL_WITHOUT_NODE,
	INVALID_DESIGN_URL,
	MOCK_FILE_KEY,
	MOCK_NODE_ID,
	MOCK_NODE_ID_URL,
	MOCK_VALID_ASSOCIATION,
	mockGetFileNodesResponse,
	mockGetFileResponse,
	PROTOTYPE_URL,
} from './mocks';

import { ISSUE_ASSOCIATED_DESIGN_RELATIONSHIP_TYPE } from '../../common/constants';
import {
	DataDepotDesign,
	DesignStatus,
	DesignType,
} from '../../domain/entities/design';

describe('FigmaTransformer', () => {
	describe('extractDataFromFigmaUrl', () => {
		it('should return fileKey only if node_id is not provided in the url', () => {
			expect(extractDataFromFigmaUrl(DESIGN_URL_WITHOUT_NODE)).toStrictEqual({
				fileKey: MOCK_FILE_KEY,
				isPrototype: false,
			});
		});
		it('should return fileKey and nodeId if both are present in the url', () => {
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
		it('should return READY_FOR_DEVELOPMENT if Figma status is "READY_FOR_DEV"', () => {
			expect(mapNodeStatusToDevStatus({ type: 'READY_FOR_DEV' })).toEqual(
				DesignStatus.READY_FOR_DEVELOPMENT,
			);
		});
		it('should return UNKNOWN for any other status', () => {
			expect(mapNodeStatusToDevStatus({ type: 'OTHER_STATUS' })).toEqual(
				DesignStatus.UNKNOWN,
			);
		});
	});

	describe('mapNodeTypeToDesignType', () => {
		it.each([
			[DesignType.PROTOTYPE, 'FRAME', true],
			[DesignType.FILE, 'DOCUMENT', false],
			[DesignType.CANVAS, 'CANVAS', false],
			[DesignType.GROUP, 'SECTION', false],
			[DesignType.GROUP, 'GROUP', false],
			[DesignType.NODE, 'FRAME', false],
			[DesignType.OTHER, 'SOMETHINGELSE', false],
		])(
			'should return %s if Figma type is %s and isPrototype is %s',
			(expected, type, isPrototype) => {
				expect(mapNodeTypeToDesignType(type, isPrototype)).toEqual(expected);
			},
		);
	});

	describe('transformNodeToDataDepotDesign', () => {
		beforeEach(() => {
			jest.useFakeTimers();
		});

		it('should correctly map to data depot design', () => {
			const mockApiResponse = mockGetFileNodesResponse({
				nodeId: MOCK_NODE_ID,
			});
			const expected: DataDepotDesign = {
				id: MOCK_NODE_ID,
				displayName: mockApiResponse.nodes[MOCK_NODE_ID].document.name,
				url: DESIGN_URL_WITH_NODE,
				liveEmbedUrl: buildLiveEmbedUrl(DESIGN_URL_WITH_NODE),
				inspectUrl: buildInspectUrl(DESIGN_URL_WITH_NODE),
				status: DesignStatus.NONE,
				type: DesignType.NODE,
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

			const result = transformNodeToDataDepotDesign({
				nodeId: MOCK_NODE_ID,
				url: DESIGN_URL_WITH_NODE,
				isPrototype: false,
				associateWith: MOCK_VALID_ASSOCIATION,
				fileNodesResponse: mockApiResponse,
			});

			expect(result).toStrictEqual(expected);
		});
	});

	describe('transformFileToDataDepotDesign', () => {
		it('should correctly map to data depot design', () => {
			const mockApiResponse = mockGetFileResponse({});
			const expected: DataDepotDesign = {
				id: MOCK_FILE_KEY,
				displayName: mockApiResponse.name,
				url: DESIGN_URL_WITHOUT_NODE,
				liveEmbedUrl: buildLiveEmbedUrl(DESIGN_URL_WITHOUT_NODE),
				inspectUrl: buildInspectUrl(DESIGN_URL_WITHOUT_NODE),
				status: DesignStatus.NONE,
				type: DesignType.FILE,
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

			const result = transformFileToDataDepotDesign({
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
