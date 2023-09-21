import { transformFileToAtlassianDesign } from './figma-file-transformer';
import { buildDesignUrl, buildInspectUrl, buildLiveEmbedUrl } from './utils';

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
				fileName: fileResponse.name,
			}),
			liveEmbedUrl: buildLiveEmbedUrl({
				fileKey,
				fileName: fileResponse.name,
			}),
			inspectUrl: buildInspectUrl({
				fileKey,
				fileName: fileResponse.name,
			}),
			status: AtlassianDesignStatus.NONE,
			type: AtlassianDesignType.FILE,
			lastUpdated: fileResponse.lastModified,
			updateSequenceNumber: new Date(fileResponse.lastModified).getTime(),
		});
	});
});
