import {
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
	getUpdateSequenceNumberFrom,
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
 * Transforms a Figma file medata to {@link AtlassianDesign}.
 */
export const transformFileMetaToAtlassianDesign = ({
	fileKey,
	fileMetaResponse,
}: TransformFileMetaToAtlassianDesignParams): AtlassianDesign => {
	const designId = new FigmaDesignIdentifier(fileKey);

	return {
		id: designId.toAtlassianDesignId(),
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
	};
};
