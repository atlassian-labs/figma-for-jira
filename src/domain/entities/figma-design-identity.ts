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
		const parsedUrl = new URL(url);

		const pathComponents = parsedUrl.pathname.split('/');
		const filePathComponentId = pathComponents.findIndex((x) => x === 'file');

		const fileKey = pathComponents[filePathComponentId + 1];
		const nodeId = parsedUrl.searchParams.get('node-id')?.replace('-', ':');

		if (!fileKey) throw new Error(`Received invalid Figma URL: ${url}`);

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