import { transformFileToAtlassianDesign } from './figma-file-transformer';
import {
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
	getUpdateSequenceNumberFrom,
	truncateDisplayName,
} from './utils';

import {
	AtlassianDesignStatus,
	AtlassianDesignType,
} from '../../../domain/entities';
import { generateFigmaFileKey } from '../../../domain/entities/testing';
import {
	generateGetFileMetaResponse,
	generateGetFileResponse,
} from '../figma-client/testing';

describe('transformFileToAtlassianDesign', () => {
	it('should correctly map to atlassian design', () => {
		const fileKey = generateFigmaFileKey();
		const fileResponse = generateGetFileResponse();
		const fileMetaResponse = generateGetFileMetaResponse();

		const result = transformFileToAtlassianDesign({
			fileKey,
			fileResponse,
			fileMetaResponse,
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
			lastUpdatedBy: { id: fileMetaResponse.file.last_touched_by.id },
			updateSequenceNumber: getUpdateSequenceNumberFrom(
				fileResponse.lastModified,
			),
		});
	});

	it('should truncate `displayName` if it is too long', () => {
		const fileKey = generateFigmaFileKey();
		const fileResponse = generateGetFileResponse({ name: 'a'.repeat(1000) });
		const fileMetaResponse = generateGetFileMetaResponse();

		const result = transformFileToAtlassianDesign({
			fileKey,
			fileResponse,
			fileMetaResponse,
		});

		expect(result.displayName).toStrictEqual(
			truncateDisplayName(fileResponse.name),
		);
	});
});
