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
import type { GetFileResponse } from '../figma-client';

type TransformFileToAtlassianDesignParams = {
	readonly fileKey: string;
	readonly fileResponse: GetFileResponse;
};

/**
 * Transforms a Figma file to {@link AtlassianDesign}.
 */
export const transformFileToAtlassianDesign = ({
	fileKey,
	fileResponse,
}: TransformFileToAtlassianDesignParams): AtlassianDesign => {
	const designId = new FigmaDesignIdentifier(fileKey);
	const fileName = fileResponse.name;

	return {
		id: designId.toAtlassianDesignId(),
		displayName: fileResponse.name,
		url: buildDesignUrl({ fileKey, fileName }),
		liveEmbedUrl: buildLiveEmbedUrl({ fileKey, fileName }),
		inspectUrl: buildInspectUrl({ fileKey, fileName }),
		status: AtlassianDesignStatus.NONE,
		type: AtlassianDesignType.FILE,
		lastUpdated: fileResponse.lastModified,
		updateSequenceNumber: getUpdateSequenceNumberFrom(
			fileResponse.lastModified,
		),
	};
};
