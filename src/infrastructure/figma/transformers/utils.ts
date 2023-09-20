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
	url.searchParams.append('embed_host', 'atlassian');
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
