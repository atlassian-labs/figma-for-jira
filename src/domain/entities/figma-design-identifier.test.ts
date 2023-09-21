import { FigmaDesignIdentifier } from './figma-design-identifier';
import {
	generateFigmaDesignIdentifier,
	generateFigmaDesignUrl,
	generateFigmaFileKey,
	generateFigmaNodeId,
} from './testing';

describe('FigmaDesignIdentifier', () => {
	describe('constructor', () => {
		it('should throw when fileKey is empty string', () => {
			expect(() => new FigmaDesignIdentifier('')).toThrow();
		});

		it('should throw when nodeId is empty string', () => {
			expect(
				() => new FigmaDesignIdentifier(generateFigmaFileKey(), ''),
			).toThrow();
		});
	});

	describe('fromAtlassianDesignId', () => {
		it('should return identifier when Atlassian design ID does not contain node part', () => {
			const fileKey = generateFigmaFileKey();
			const result = FigmaDesignIdentifier.fromAtlassianDesignId(fileKey);

			expect(result).toStrictEqual(new FigmaDesignIdentifier(fileKey));
		});

		it('should return identifier when Atlassian design ID contains node part', () => {
			const fileKey = generateFigmaFileKey();
			const nodeId = generateFigmaNodeId();
			const result = FigmaDesignIdentifier.fromAtlassianDesignId(
				`${fileKey}/${nodeId}`,
			);

			expect(result).toStrictEqual(new FigmaDesignIdentifier(fileKey, nodeId));
		});

		it('should throw when Atlassian design ID has unexpected format', () => {
			expect(() => FigmaDesignIdentifier.fromAtlassianDesignId(``)).toThrow();
		});
	});

	describe('fromFigmaDesignUrl', () => {
		it('should return identifier when URL does not contain node_id', () => {
			const fileKey = generateFigmaFileKey();
			const designUrl = generateFigmaDesignUrl({ fileKey });

			const result = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);

			expect(result).toStrictEqual(new FigmaDesignIdentifier(fileKey));
		});

		it('should return identifier when URL contains node_id with ":" separator', () => {
			const fileKey = generateFigmaFileKey();
			const nodeId = '42:1';
			const designUrl = `https://www.figma.com/file/${fileKey}?node-id=${nodeId}`;

			const result = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);

			expect(result).toStrictEqual(new FigmaDesignIdentifier(fileKey, nodeId));
		});

		it('should return identifier when URL contains node_id with encoded ":" separator', () => {
			const fileKey = generateFigmaFileKey();
			const nodeId = '42:1';
			const designUrl = `https://www.figma.com/file/${fileKey}?node-id=42%3A1`;

			const result = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);

			expect(result).toStrictEqual(new FigmaDesignIdentifier(fileKey, nodeId));
		});

		it('should return identifier when URL contains node_id with "-" separator', () => {
			const fileKey = generateFigmaFileKey();
			const nodeId = '42:1';
			const designUrl = `https://www.figma.com/file/${fileKey}?node-id=42-1`;

			const result = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);

			expect(result).toStrictEqual(new FigmaDesignIdentifier(fileKey, nodeId));
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
			const designId = generateFigmaDesignIdentifier();

			const result = designId.nodeIdOrDefaultDocumentId;

			expect(result).toBe('0:0');
		});

		it('should return document ID when nodeId is presented', () => {
			const nodeId = generateFigmaNodeId();
			const designId = generateFigmaDesignIdentifier({ nodeId });

			const result = designId.nodeIdOrDefaultDocumentId;

			expect(result).toBe(nodeId);
		});
	});

	describe('toAtlassianDesignId', () => {
		it('should return Atlassian design ID when nodeId is missing', () => {
			const designId = generateFigmaDesignIdentifier();

			const result = designId.toAtlassianDesignId();

			expect(result).toBe(designId.fileKey);
		});

		it('should return Atlassian design ID when nodeId is presented', () => {
			const nodeId = generateFigmaNodeId();
			const designId = generateFigmaDesignIdentifier({ nodeId });

			const result = designId.toAtlassianDesignId();

			expect(result).toBe(`${designId.fileKey}/${designId.nodeId}`);
		});
	});
});
