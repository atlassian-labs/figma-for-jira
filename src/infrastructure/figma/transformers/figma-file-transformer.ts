import {
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
	getUpdateSequenceNumberFrom,
	truncateDisplayName,
} from './utils';

import type { AtlassianDesign } from '../../../domain/entities';
import {
	AtlassianDesignStatus,
	AtlassianDesignType,
	FigmaDesignIdentifier,
} from '../../../domain/entities';
import type { GetFileMetaResponse, GetFileResponse } from '../figma-client';

type TransformFileToAtlassianDesignParams = {
	readonly fileKey: string;
	readonly fileResponse: GetFileResponse;
	readonly fileMetaResponse: GetFileMetaResponse;
};

/**
 * Transforms a Figma file to {@link AtlassianDesign}.
 */
export const transformFileToAtlassianDesign = ({
	fileKey,
	fileResponse,
	fileMetaResponse,
}: TransformFileToAtlassianDesignParams): AtlassianDesign => {
	const designId = new FigmaDesignIdentifier(fileKey);
	const lastUpdatedBy = fileMetaResponse.file.last_touched_by;

	return {
		id: designId.toAtlassianDesignId(),
		displayName: truncateDisplayName(fileResponse.name),
		url: buildDesignUrl({ fileKey }).toString(),
		liveEmbedUrl: buildLiveEmbedUrl({ fileKey }).toString(),
		inspectUrl: buildInspectUrl({ fileKey }).toString(),
		status: AtlassianDesignStatus.NONE,
		type: AtlassianDesignType.FILE,
		lastUpdated: fileResponse.lastModified,
		...(lastUpdatedBy ? { lastUpdatedBy: { id: lastUpdatedBy.id } } : {}),
		updateSequenceNumber: getUpdateSequenceNumberFrom(
			fileResponse.lastModified,
		),
	};
};
