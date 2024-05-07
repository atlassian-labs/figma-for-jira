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
import type { GetFileMetaResponse } from '../figma-client';

type TransformFileMetaToAtlassianDesignParams = {
	readonly fileKey: string;
	readonly fileMetaResponse: GetFileMetaResponse;
};

/**
 * Transforms a Figma file metadata to {@link AtlassianDesign}.
 */
export const transformFileMetaToAtlassianDesign = ({
	fileKey,
	fileMetaResponse,
}: TransformFileMetaToAtlassianDesignParams): AtlassianDesign => {
	const designId = new FigmaDesignIdentifier(fileKey);
	const lastUpdatedBy = fileMetaResponse.file.last_touched_by;

	return {
		id: designId.toAtlassianDesignId(),
		displayName: truncateDisplayName(fileMetaResponse.file.name),
		url: buildDesignUrl({ fileKey }).toString(),
		liveEmbedUrl: buildLiveEmbedUrl({ fileKey }).toString(),
		inspectUrl: buildInspectUrl({ fileKey }).toString(),
		status: AtlassianDesignStatus.NONE,
		type: AtlassianDesignType.FILE,
		lastUpdated: fileMetaResponse.file.last_touched_at,
		...(lastUpdatedBy ? { lastUpdatedBy: { id: lastUpdatedBy.id } } : {}),
		updateSequenceNumber: getUpdateSequenceNumberFrom(
			fileMetaResponse.file.last_touched_at,
		),
	};
};
