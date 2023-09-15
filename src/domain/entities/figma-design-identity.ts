const FIGMA_DOCUMENT_NODE_ID = '0:0';

export class FigmaDesignIdentity {
	constructor(
		readonly fileKey: string,
		readonly nodeId?: string,
	) {}

	/**
	 * Creates {@link FigmaDesignIdentity} from the given {@link AtlassianDesign} ID.
	 */
	static fromAtlassianDesignId = (id: string): FigmaDesignIdentity => {
		const [fileKey, nodeId] = id.split('/');
		if (!fileKey) {
			throw new Error(`Received invalid Design ID: ${id}`);
		}
		return new FigmaDesignIdentity(fileKey, nodeId);
	};

	/**
	 * Creates {@link FigmaDesignIdentity} from the given Figma's design URL.
	 *
	 * The method parses the URL and extracts data required for building {@link FigmaDesignIdentity}.
	 */
	static fromFigmaDesignUrl = (url: string): FigmaDesignIdentity => {
		const parsedUrl = new URL(url);

		const pathComponents = parsedUrl.pathname.split('/');
		const filePathComponentId = pathComponents.findIndex((x) => x === 'file');

		const fileKey = pathComponents[filePathComponentId + 1];
		const nodeId = parsedUrl.searchParams.get('node-id')?.replace('-', ':');

		if (!fileKey) throw new Error(`Received invalid Figma URL: ${url}`);

		return new FigmaDesignIdentity(fileKey, nodeId);
	};

	/**
	 * Returns the {@link nodeId} or the document ID (`0:0`).
	 */
	get nodeIdOrDefaultDocumentId(): string {
		return this.nodeId ?? FIGMA_DOCUMENT_NODE_ID;
	}

	/**
	 * Returns an {@link AtlassianDesign} that corresponds to this {@link FigmaDesignIdentity}.
	 *
	 * An ID has the following format:
	 * - `fileKey/nodeId` when {@link nodeId} is defined.
	 * - `fileKey` when {@link nodeId} is not defined.
	 */
	toAtlassianDesignId = () => {
		return [this.fileKey, this.nodeId].filter(Boolean).join('/');
	};
}
