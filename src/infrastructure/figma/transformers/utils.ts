import { truncateToMillis } from '../../../common/date-utils';
import { getConfig } from '../../../config';

/**
 * Builds a URL to a Figma design given Figma file/node metadata.
 */
export const buildDesignUrl = ({
	fileKey,
	fileName,
	nodeId,
}: {
	fileKey: string;
	fileName: string;
	nodeId?: string;
}): string => {
	const url = new URL(
		`${getConfig().figma.webBaseUrl}/file/${fileKey}/${fileName}`,
	);
	if (nodeId) {
		url.searchParams.append('node-id', nodeId);
	}
	return url.toString();
};

/**
 * Builds a Live Embed URL to a Figma design given Figma file/node metadata.
 * Inspect URL is used as this is the preferred mode of display in Jira.
 * @see https://www.figma.com/developers/embed
 */
export const buildLiveEmbedUrl = ({
	fileKey,
	fileName,
	nodeId,
}: {
	fileKey: string;
	fileName: string;
	nodeId?: string;
}): string => {
	const inspectUrl = buildInspectUrl({ fileKey, fileName, nodeId });
	const url = new URL(`${getConfig().figma.webBaseUrl}/embed`);
	url.searchParams.append('embed_host', 'figma-jira-add-on');
	url.searchParams.append('url', inspectUrl);
	return url.toString();
};

/**
 * Builds an Inspect Mode URL to a Figma design given Figma file/node metadata.
 */
export const buildInspectUrl = ({
	fileKey,
	fileName,
	nodeId,
}: {
	fileKey: string;
	fileName: string;
	nodeId?: string;
}): string => {
	const url = new URL(
		`${getConfig().figma.webBaseUrl}/file/${fileKey}/${fileName}`,
	);
	if (nodeId) {
		url.searchParams.append('node-id', nodeId);
	}
	url.searchParams.set('mode', 'dev');
	return url.toString();
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
