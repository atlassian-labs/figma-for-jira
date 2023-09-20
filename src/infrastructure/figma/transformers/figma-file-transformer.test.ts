import { transformFileToAtlassianDesign } from './figma-file-transformer';
import { buildDesignUrl, buildInspectUrl, buildLiveEmbedUrl } from './utils';

import * as configModule from '../../../config';
import { mockConfig } from '../../../config/testing';
import type { AtlassianDesign } from '../../../domain/entities';
import {
	AtlassianDesignStatus,
	AtlassianDesignType,
} from '../../../domain/entities';
import {
	generateGetFileResponse,
	MOCK_FILE_KEY,
	MOCK_FILE_NAME,
} from '../figma-client/testing';

jest.mock('../../../config', () => {
	return {
		...jest.requireActual('../../../config'),
		getConfig: jest.fn(),
	};
});

describe('transformFileToAtlassianDesign', () => {
	beforeEach(() => {
		(configModule.getConfig as jest.Mock).mockReturnValue(mockConfig);
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should correctly map to atlassian design', () => {
		const mockApiResponse = generateGetFileResponse();
		const expected: AtlassianDesign = {
			id: MOCK_FILE_KEY,
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
