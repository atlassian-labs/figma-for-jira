const FIGMA_DOCUMENT_NODE_ID = '0:0';

/**
 * Represents an identifier of a Figma design, which can be associated with
 * an Atlassian entity (e.g., Jira issue).
 *
 * An identifier can point out to:
 * - A Figma file
 * - A specific node within Figma file.
 */
export class FigmaDesignIdentifier {
	constructor(
		readonly fileKey: string,
		readonly nodeId?: string,
	) {
		if (fileKey.length === 0) throw new Error('fileKey is empty string.');
		if (nodeId?.length === 0) throw new Error('nodeId is empty string.');
	}

	/**
	 * Creates {@link FigmaDesignIdentifier} from the given {@link AtlassianDesign} ID.
	 */
	static fromAtlassianDesignId = (id: string): FigmaDesignIdentifier => {
		const [fileKey, nodeId] = id.split('/');
		if (!fileKey) {
			throw new Error(`Received invalid Design ID: ${id}`);
		}
		return new FigmaDesignIdentifier(fileKey, nodeId);
	};

	/**
	 * Creates {@link FigmaDesignIdentifier} from the given Figma's design URL.
	 *
	 * The method parses the URL and extracts data required for building {@link FigmaDesignIdentifier}.
	 */
	static fromFigmaDesignUrl = (url: string): FigmaDesignIdentifier => {
		const parsedUrl = new URL(url);

		const pathComponents = parsedUrl.pathname.split('/');
		const filePathComponentId = pathComponents.findIndex(
			(x) => x === 'file' || x === 'proto',
		);

		const fileKey = pathComponents[filePathComponentId + 1];
		const nodeId = parsedUrl.searchParams.get('node-id')?.replace('-', ':');

		if (!fileKey) throw new Error(`Received invalid Figma URL: ${url}`);

		return new FigmaDesignIdentifier(fileKey, nodeId);
	};

	/**
	 * Returns the {@link nodeId} or the document ID (`0:0`).
	 */
	get nodeIdOrDefaultDocumentId(): string {
		return this.nodeId ?? FIGMA_DOCUMENT_NODE_ID;
	}

	/**
	 * Returns an {@link AtlassianDesign} that corresponds to this {@link FigmaDesignIdentifier}.
	 *
	 * An ID has the following format:
	 * - `fileKey/nodeId` when {@link nodeId} is defined.
	 * - `fileKey` when {@link nodeId} is not defined.
	 */
	toAtlassianDesignId(): string {
		return [this.fileKey, this.nodeId].filter(Boolean).join('/');
	}
}
