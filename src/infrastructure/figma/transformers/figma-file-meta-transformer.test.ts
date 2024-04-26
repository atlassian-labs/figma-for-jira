import { transformFileMetaToAtlassianDesign } from './figma-file-meta-transformer';
import {
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
	getResourceIconUrl,
	getUpdateSequenceNumberFrom,
	truncateDisplayName,
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
		const resourceIconUrl = getResourceIconUrl();

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
			lastUpdatedBy: fileMetaResponse.file.last_touched_by,
			iconUrl: resourceIconUrl,
			updateSequenceNumber: getUpdateSequenceNumberFrom(
				fileMetaResponse.file.last_touched_at,
			),
		});
	});

	it('should truncate `displayName` if it is too long', () => {
		const fileKey = generateFigmaFileKey();
		const fileMetaResponse = generateGetFileMetaResponse({
			name: 'a'.repeat(1000),
		});

		const result = transformFileMetaToAtlassianDesign({
			fileKey,
			fileMetaResponse,
		});

		expect(result.displayName).toStrictEqual(
			truncateDisplayName(fileMetaResponse.file.name),
		);
	});
});
