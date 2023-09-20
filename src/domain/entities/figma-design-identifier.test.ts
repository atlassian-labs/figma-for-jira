import { FigmaDesignIdentifier } from './figma-design-identifier';
import {
	MOCK_FIGMA_FILE_KEY,
	MOCK_FIGMA_NODE_ID,
	MOCK_FILE_FIGMA_DESIGN_IDENTIFIER,
	MOCK_NODE_FIGMA_DESIGN_IDENTIFIER,
} from './testing';

describe('FigmaDesignIdentifier', () => {
	describe('constructor', () => {
		it('should throw when fileKey is empty string', () => {
			expect(() => new FigmaDesignIdentifier('')).toThrow();
		});

		it('should throw when nodeId is empty string', () => {
			expect(
				() => new FigmaDesignIdentifier(MOCK_FIGMA_FILE_KEY, ''),
			).toThrow();
		});
	});

	describe('fromAtlassianDesignId', () => {
		it('should return identifier when Atlassian design ID does not contain node part', () => {
			const result =
				FigmaDesignIdentifier.fromAtlassianDesignId(MOCK_FIGMA_FILE_KEY);

			expect(result).toStrictEqual(
				new FigmaDesignIdentifier(MOCK_FIGMA_FILE_KEY),
			);
		});

		it('should return identifier when Atlassian design ID contains node part', () => {
			const result = FigmaDesignIdentifier.fromAtlassianDesignId(
				`${MOCK_FIGMA_FILE_KEY}/${MOCK_FIGMA_NODE_ID}`,
			);

			expect(result).toStrictEqual(
				new FigmaDesignIdentifier(MOCK_FIGMA_FILE_KEY, MOCK_FIGMA_NODE_ID),
			);
		});

		it('should throw when Atlassian design ID has unexpected format', () => {
			expect(() => FigmaDesignIdentifier.fromAtlassianDesignId(``)).toThrow();
		});
	});

	describe('fromFigmaDesignUrl', () => {
		it('should return identifier when URL does not contain node_id', () => {
			const designUrl = new URL(
				`https://www.figma.com/file/${MOCK_FIGMA_FILE_KEY}`,
			).toString();

			const result = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);

			expect(result).toStrictEqual(
				new FigmaDesignIdentifier(MOCK_FIGMA_FILE_KEY),
			);
		});

		it('should return identifier when URL contains node_id with ":" separator', () => {
			const designUrl = new URL(
				`https://www.figma.com/file/${MOCK_FIGMA_FILE_KEY}?node-id=42:1`,
			).toString();

			const result = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);

			expect(result).toStrictEqual(
				new FigmaDesignIdentifier(MOCK_FIGMA_FILE_KEY, '42:1'),
			);
		});

		it('should return identifier when URL contains node_id with encoded ":" separator', () => {
			const designUrl = new URL(
				`https://www.figma.com/file/${MOCK_FIGMA_FILE_KEY}?node-id=42%3A1`,
			).toString();

			const result = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);

			expect(result).toStrictEqual(
				new FigmaDesignIdentifier(MOCK_FIGMA_FILE_KEY, '42:1'),
			);
		});

		it('should return identifier when URL contains node_id with "-" separator', () => {
			const designUrl = new URL(
				`https://www.figma.com/file/${MOCK_FIGMA_FILE_KEY}?node-id=42-1`,
			).toString();

			const result = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);

			expect(result).toStrictEqual(
				new FigmaDesignIdentifier(MOCK_FIGMA_FILE_KEY, '42:1'),
			);
		});

		it.each([
			`https://www.figma.com`,
			`https://www.figma.com/file`,
			`https://www.figma.com?param=file%2Fsome-id`,
			'',
		])('should throw when URL has an unexpected format', (input: string) => {
			expect(() => FigmaDesignIdentifier.fromFigmaDesignUrl(input)).toThrow();
		});
	});

	describe('nodeIdOrDefaultDocumentId', () => {
		it('should return document ID when nodeId is missing', () => {
			const result =
				MOCK_FILE_FIGMA_DESIGN_IDENTIFIER.nodeIdOrDefaultDocumentId;

			expect(result).toBe('0:0');
		});

		it('should return document ID when nodeId is presented', () => {
			const result =
				MOCK_NODE_FIGMA_DESIGN_IDENTIFIER.nodeIdOrDefaultDocumentId;

			expect(result).toBe(MOCK_NODE_FIGMA_DESIGN_IDENTIFIER.nodeId);
		});
	});

	describe('toAtlassianDesignId', () => {
		it('should return Atlassian design ID when nodeId is missing', () => {
			const result = MOCK_FILE_FIGMA_DESIGN_IDENTIFIER.toAtlassianDesignId();

			expect(result).toBe(MOCK_NODE_FIGMA_DESIGN_IDENTIFIER.fileKey);
		});

		it('should return Atlassian design ID when nodeId is presented', () => {
			const result = MOCK_NODE_FIGMA_DESIGN_IDENTIFIER.toAtlassianDesignId();

			expect(result).toBe(
				`${MOCK_NODE_FIGMA_DESIGN_IDENTIFIER.fileKey}/${MOCK_NODE_FIGMA_DESIGN_IDENTIFIER.nodeId}`,
			);
		});
	});
});