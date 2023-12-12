import { FigmaDesignIdentifier } from './figma-design-identifier';
import {
	generateFigmaDesignIdentifier,
	generateFigmaDesignUrl,
	generateFigmaFileKey,
	generateFigmaNodeId,
} from './testing';

import { InvalidInputUseCaseResultError } from '../../usecases/errors';

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
			const designUrl = new URL(generateFigmaDesignUrl({ fileKey }));

			const result = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);

			expect(result).toStrictEqual(new FigmaDesignIdentifier(fileKey));
		});

		it('should return identifier when URL contains node_id with ":" separator', () => {
			const fileKey = generateFigmaFileKey();
			const nodeId = '42:1';
			const designUrl = new URL(
				`https://www.figma.com/file/${fileKey}?node-id=${nodeId}`,
			);

			const result = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);

			expect(result).toStrictEqual(new FigmaDesignIdentifier(fileKey, nodeId));
		});

		it('should return identifier when URL contains node_id with encoded ":" separator', () => {
			const fileKey = generateFigmaFileKey();
			const nodeId = '42:1';
			const designUrl = new URL(
				`https://www.figma.com/file/${fileKey}?node-id=42%3A1`,
			);

			const result = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);

			expect(result).toStrictEqual(new FigmaDesignIdentifier(fileKey, nodeId));
		});

		it('should return identifier when URL contains node_id with "-" separator', () => {
			const fileKey = generateFigmaFileKey();
			const nodeId = '42:1';
			const designUrl = new URL(
				`https://www.figma.com/file/${fileKey}?node-id=42-1`,
			);

			const result = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);

			expect(result).toStrictEqual(new FigmaDesignIdentifier(fileKey, nodeId));
		});

		it('should return an identifier when URL is a prototype link', () => {
			const fileKey = generateFigmaFileKey();
			const nodeId = '42:1';
			const designUrl = new URL(
				`https://www.figma.com/proto/${fileKey}?node-id=42%3A1`,
			);

			const result = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);

			expect(result).toStrictEqual(new FigmaDesignIdentifier(fileKey, nodeId));
		});

		it('should return an identifier when URL is a prototype link with additional query parameters', () => {
			const fileKey = generateFigmaFileKey();
			const nodeId = '42:1';
			const designUrl = new URL(
				`https://www.figma.com/proto/${fileKey}?type=design&node-id=42%3A1&scaling=min-zoom&page-id=935%3A206682&starting-point-node-id=1197%3A290236`,
			);

			const result = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);

			expect(result).toStrictEqual(new FigmaDesignIdentifier(fileKey, nodeId));
		});

		it.each([
			new URL(`https://www.figma.com`),
			new URL(`https://www.figma.com/file`),
			new URL(`https://www.figma.com/proto`),
			new URL(`https://www.figma.com?param=file%2Fsome-id`),
			new URL(`https://www.figma.com?param=proto%2Fsome-id`),
			new URL(
				`https://www.figma.com/files/project/176167247/Team-project?fuid=1166427116484924636`,
			),
		])('should throw when URL has an unexpected format', (input: URL) => {
			expect(() => FigmaDesignIdentifier.fromFigmaDesignUrl(input)).toThrow(
				InvalidInputUseCaseResultError,
			);
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
