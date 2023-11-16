import { transformFileMetaToAtlassianDesign } from './figma-file-meta-transformer';
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
import { generateGetFileMetaResponse } from '../figma-client/testing';

jest.mock('../../../config', () => {
	return {
		...jest.requireActual('../../../config'),
		getConfig: jest.fn(),
	};
});

describe('transformFileMetaToAtlassianDesign', () => {
	beforeEach(() => {
		(configModule.getConfig as jest.Mock).mockReturnValue(mockConfig);
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should correctly map to atlassian design', () => {
		const fileKey = generateFigmaFileKey();
		const fileMetaResponse = generateGetFileMetaResponse();

		const result = transformFileMetaToAtlassianDesign({
			fileKey,
			fileMetaResponse,
		});

		expect(result).toStrictEqual({
			id: fileKey,
			displayName: fileMetaResponse.file.name,
			url: buildDesignUrl({ fileKey }),
			liveEmbedUrl: buildLiveEmbedUrl({ fileKey }),
			inspectUrl: buildInspectUrl({ fileKey }),
			status: AtlassianDesignStatus.NONE,
			type: AtlassianDesignType.FILE,
			lastUpdated: fileMetaResponse.file.last_touched_at,
			updateSequenceNumber: getUpdateSequenceNumberFrom(
				fileMetaResponse.file.last_touched_at,
			),
		});
	});
});
