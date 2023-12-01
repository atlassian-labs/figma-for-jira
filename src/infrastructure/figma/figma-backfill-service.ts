import {
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
} from './transformers/utils';

import type { AtlassianDesign } from '../../domain/entities';
import {
	AtlassianDesignStatus,
	AtlassianDesignType,
	FigmaDesignIdentifier,
} from '../../domain/entities';

/**
 * A service that implements functionality specifically for the backfill process.
 *
 * Designs can be backfilled if there were associated using the old "Figma for Jira" experience or
 * the "Jira" widget/plugin in Figma.
 */
export class FigmaBackfillService {
	/**
	 * Returns a flag indicating whether the design is being backfilled.
	 *
	 * The design is considered for backfill if it contains a special query parameter (`com.atlassian.designs.backfill`).
	 *
	 * @remarks
	 * Jira Frontend appends an additional query parameter to the design URL as a temporary workaround that allows to
	 * distinguish "Backfill" from normal "Associate" operations. Therefore, the app can apply some special considerations
	 * to designs for backfill (e.g., handle deleted designs).
	 */
	isDesignForBackfill = (url: URL): boolean => {
		return url.searchParams.has('com.atlassian.designs.backfill', 'true');
	};

	/**
	 * Creates {@link AtlassianDesign} from the given design URL.
	 * If data cannot be derived from the URL, use a reasonable default value for corresponding field.
	 *
	 * @remarks
	 * Normally, a design should be fetched from Figma. However, there are use cases
	 * when it can be not possible to do for valid reasons (e.g., backfill already associated but deleted/unavailable design).
	 * Avoid using this method for normal use cases -- limit its usage to the backfill only.
	 */
	buildMinimalDesignFromUrl(url: URL): AtlassianDesign {
		const designId = FigmaDesignIdentifier.fromFigmaDesignUrl(url);
		const [, , , name] = url.pathname.split('/');

		const displayName = name
			? decodeURIComponent(name).replaceAll('-', ' ')
			: 'Untitled';

		return {
			id: designId.toAtlassianDesignId(),
			displayName,
			url: buildDesignUrl(designId).toString(),
			liveEmbedUrl: buildLiveEmbedUrl(designId).toString(),
			inspectUrl: buildInspectUrl(designId).toString(),
			status: AtlassianDesignStatus.UNKNOWN, // Cannot be derived from the URL. Use the default value.
			type: designId.nodeId
				? AtlassianDesignType.NODE
				: AtlassianDesignType.FILE,
			lastUpdated: new Date(0).toISOString(), // Cannot be derived from the URL. Use the default value.
			updateSequenceNumber: 0,
		};
	}
}

export const figmaBackfillService = new FigmaBackfillService();
