const FIGMA_ROOT_NODE_ID = '0:0';

export class FigmaDesignIdentity {
	constructor(
		readonly fileKey: string,
		readonly nodeId?: string,
	) {}

	/**
	 * Parses a design identifier into a tuple of its parts: [fileKey, nodeId]
	 */
	static fromAtlassianDesignId = (id: string): FigmaDesignIdentity => {
		const [fileKey, nodeId] = id.split('/');
		if (!fileKey || !nodeId) {
			throw new Error(`Received invalid Design ID: ${id}`);
		}
		return new FigmaDesignIdentity(fileKey, nodeId);
	};

	static fromFigmaDesignUrl = (url: string): FigmaDesignIdentity => {
		const fileKeyRegex = /file\/([a-zA-Z0-9]+)/;
		const nodeIdRegex = /node-id=([a-zA-Z0-9-]+)/;

		const fileKeyMatch = url.match(fileKeyRegex);
		const nodeIdMatch = url.match(nodeIdRegex);

		if (!fileKeyMatch) throw new Error(`Received invalid Figma URL: ${url}`);

		const fileKey = fileKeyMatch[1];
		const nodeId = nodeIdMatch?.[1]?.replace('-', ':');

		return new FigmaDesignIdentity(fileKey, nodeId);
	};

	get referencesNode(): boolean {
		return !!this.nodeId && this.nodeId !== FIGMA_ROOT_NODE_ID;
	}

	get nodeIdOrRootNodeId(): string {
		return this.nodeId ?? FIGMA_ROOT_NODE_ID;
	}

	nodeIdOrThrow = (): string => {
		if (!this.nodeId) throw new Error('nodeId is missing.');

		return this.nodeId;
	};

	/**
	 * Builds an {@link AtlassianDesign} identifier given a fileKey and optional nodeId.
	 * A design identifier is a composite of `<fileKey>/<nodeId>`
	 */
	toAtlassianDesignId = () => {
		return `${this.fileKey}/${this.nodeIdOrRootNodeId}`;
	};
}
