import { transformFileToAtlassianDesign } from './figma-file-transformer';
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
import { generateGetFileResponse } from '../figma-client/testing';

describe('transformFileToAtlassianDesign', () => {
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
			}).toString(),
			liveEmbedUrl: buildLiveEmbedUrl({
				fileKey,
			}).toString(),
			inspectUrl: buildInspectUrl({
				fileKey,
			}).toString(),
			status: AtlassianDesignStatus.NONE,
			type: AtlassianDesignType.FILE,
			lastUpdated: fileResponse.lastModified,
			updateSequenceNumber: getUpdateSequenceNumberFrom(
				fileResponse.lastModified,
			),
		});
	});
});
