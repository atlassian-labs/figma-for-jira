import { transformFileToAtlassianDesign } from './figma-file-transformer';
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
import { generateGetFileResponse } from '../figma-client/testing';

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
		const fileKey = generateFigmaFileKey();
		const fileResponse = generateGetFileResponse();

		const result = transformFileToAtlassianDesign({
			fileKey,
			fileResponse,
		});

		expect(result).toStrictEqual({
			id: fileKey,
			displayName: fileResponse.name,
			url: buildDesignUrl({
				fileKey,
			}),
			liveEmbedUrl: buildLiveEmbedUrl({
				fileKey,
			}),
			inspectUrl: buildInspectUrl({
				fileKey,
			}),
			status: AtlassianDesignStatus.NONE,
			type: AtlassianDesignType.FILE,
			lastUpdated: fileResponse.lastModified,
			updateSequenceNumber: getUpdateSequenceNumberFrom(
				fileResponse.lastModified,
			),
		});
	});
});
