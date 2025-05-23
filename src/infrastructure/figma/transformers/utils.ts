import { truncateToMillis } from '../../../common/date-utils';
import { truncate } from '../../../common/string-utils';
import { getConfig } from '../../../config';

const MAX_DISPLAY_NAME_LENGTH = 255;

/**
 * Builds a URL to a Figma design given Figma file/node metadata.
 */
export const buildDesignUrl = ({
	fileKey,
	nodeId,
}: {
	fileKey: string;
	nodeId?: string;
}): URL => {
	const url = new URL(
		`file/${encodeURIComponent(fileKey)}`,
		getConfig().figma.webBaseUrl,
	);
	if (nodeId) {
		url.searchParams.append('node-id', nodeId);
	}
	return url;
};

/**
 * Builds an Inspect Mode URL to a Figma design given Figma file/node metadata.
 */
export const buildInspectUrl = ({
	fileKey,
	nodeId,
}: {
	fileKey: string;
	nodeId?: string;
}): URL => {
	const url = new URL(
		`file/${encodeURIComponent(fileKey)}`,
		getConfig().figma.webBaseUrl,
	);
	if (nodeId) {
		url.searchParams.append('node-id', nodeId);
	}
	url.searchParams.set('mode', 'dev');
	return url;
};

/**
 * Builds a Live Embed URL to a Figma design given Figma file/node metadata.
 * Inspect URL is used as this is the preferred mode of display in Jira.
 * @see https://www.figma.com/developers/embed
 */
export const buildLiveEmbedUrl = ({
	fileKey,
	nodeId,
}: {
	fileKey: string;
	nodeId?: string;
}): URL => {
	const inspectUrl = buildInspectUrl({ fileKey, nodeId });
	const url = new URL(`embed`, getConfig().figma.webBaseUrl);
	url.searchParams.append('embed_host', 'figma-jira-add-on');
	url.searchParams.append('url', inspectUrl.toString());
	return url;
};

/**
 * Returns an Update Sequence Number from the given ISO 8601 date string.
 *
 * An Update Sequence Number represents a timestamps from a Date truncated to milliseconds.
 *
 * @remarks
 * The truncation is required since different Figma API return dates with different precision, e.g.:
 *
 * - {@link FigmaClient.getFileMeta} returns `last_touched_at` with millisecond precision.
 * - {@link FigmaClient.getFile} returns `lastModified` with second precision.
 *
 * Therefore, truncate the date to the common precision to avoid inconsistent ingestion behaviour among different
 * use cases.
 */
export const getUpdateSequenceNumberFrom = (dateIsoString: string): number => {
	const lastUpdated = truncateToMillis(new Date(dateIsoString));

	return lastUpdated.getTime();
};

export const truncateDisplayName = (displayName: string): string => {
	return truncate(displayName, MAX_DISPLAY_NAME_LENGTH);
};
