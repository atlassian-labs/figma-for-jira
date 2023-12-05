import { transformFileMetaToAtlassianDesign } from './figma-file-meta-transformer';
import {
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
	getUpdateSequenceNumberFrom,
} from './utils';

import {
	AtlassianDesignStatus,
	AtlassianDesignType,
} from '../../../domain/entities';
import { generateFigmaFileKey } from '../../../domain/entities/testing';
import { generateGetFileMetaResponse } from '../figma-client/testing';

describe('transformFileMetaToAtlassianDesign', () => {
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
			url: buildDesignUrl({ fileKey }).toString(),
			liveEmbedUrl: buildLiveEmbedUrl({ fileKey }).toString(),
			inspectUrl: buildInspectUrl({ fileKey }).toString(),
			status: AtlassianDesignStatus.NONE,
			type: AtlassianDesignType.FILE,
			lastUpdated: fileMetaResponse.file.last_touched_at,
			updateSequenceNumber: getUpdateSequenceNumberFrom(
				fileMetaResponse.file.last_touched_at,
			),
		});
	});
});
