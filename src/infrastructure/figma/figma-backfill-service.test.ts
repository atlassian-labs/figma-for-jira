import { figmaBackfillService } from './figma-backfill-service';
import {
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
	getResourceIconUrl,
	truncateDisplayName,
} from './transformers/utils';

import {
	AtlassianDesignStatus,
	AtlassianDesignType,
	FigmaDesignIdentifier,
} from '../../domain/entities';
import {
	generateFigmaFileKey,
	generateFigmaNodeId,
} from '../../domain/entities/testing';

describe('FigmaBackfillService', () => {
	describe('buildMinimalDesignFromUrl', () => {
		it('should return design for Figma file URL', () => {
			const fileKey = generateFigmaFileKey();
			const fileName = 'Design1';
			const designId = new FigmaDesignIdentifier(fileKey);
			const resourceIconUrl = getResourceIconUrl();

			const result = figmaBackfillService.buildMinimalDesignFromUrl(
				new URL(`https://www.figma.com/file/${fileKey}/${fileName}`),
			);

			expect(result).toStrictEqual({
				id: designId.toAtlassianDesignId(),
				displayName: fileName,
				url: buildDesignUrl(designId).toString(),
				liveEmbedUrl: buildLiveEmbedUrl(designId).toString(),
				inspectUrl: buildInspectUrl(designId).toString(),
				status: AtlassianDesignStatus.UNKNOWN,
				type: AtlassianDesignType.FILE,
				lastUpdated: new Date(0).toISOString(),
				iconUrl: resourceIconUrl,
				updateSequenceNumber: 0,
			});
		});

		it('should return design for Figma node URL', () => {
			const fileKey = generateFigmaFileKey();
			const nodeId = generateFigmaNodeId();
			const fileName = 'Design1';
			const designId = new FigmaDesignIdentifier(fileKey, nodeId);
			const resourceIconUrl = getResourceIconUrl();

			const result = figmaBackfillService.buildMinimalDesignFromUrl(
				new URL(
					`https://www.figma.com/file/${fileKey}/${fileName}?node-id=${nodeId}`,
				),
			);

			expect(result).toStrictEqual({
				id: designId.toAtlassianDesignId(),
				displayName: fileName,
				url: buildDesignUrl(designId).toString(),
				liveEmbedUrl: buildLiveEmbedUrl(designId).toString(),
				inspectUrl: buildInspectUrl(designId).toString(),
				status: AtlassianDesignStatus.UNKNOWN,
				type: AtlassianDesignType.NODE,
				lastUpdated: new Date(0).toISOString(),
				iconUrl: resourceIconUrl,
				updateSequenceNumber: 0,
			});
		});

		it('should return design for Figma URL with minimal information', () => {
			const fileKey = generateFigmaFileKey();
			const designId = new FigmaDesignIdentifier(fileKey);
			const resourceIconUrl = getResourceIconUrl();

			const result = figmaBackfillService.buildMinimalDesignFromUrl(
				new URL(`https://www.figma.com/file/${fileKey}`),
			);

			expect(result).toStrictEqual({
				id: designId.toAtlassianDesignId(),
				displayName: 'Untitled',
				url: buildDesignUrl(designId).toString(),
				liveEmbedUrl: buildLiveEmbedUrl(designId).toString(),
				inspectUrl: buildInspectUrl(designId).toString(),
				status: AtlassianDesignStatus.UNKNOWN,
				type: AtlassianDesignType.FILE,
				lastUpdated: new Date(0).toISOString(),
				iconUrl: resourceIconUrl,
				updateSequenceNumber: 0,
			});
		});

		it('should decode URL path component with name', () => {
			const fileKey = generateFigmaFileKey();

			const result = figmaBackfillService.buildMinimalDesignFromUrl(
				new URL(`https://www.figma.com/file/${fileKey}/Test-%2F-Design-1`),
			);

			expect(result.displayName).toStrictEqual('Test / Design 1');
		});

		it('should truncate `displayName` if it is too long', () => {
			const fileKey = generateFigmaFileKey();
			const fileName = 'a'.repeat(1000);

			const result = figmaBackfillService.buildMinimalDesignFromUrl(
				new URL(`https://www.figma.com/file/${fileKey}/${fileName}`),
			);

			expect(result?.displayName).toStrictEqual(truncateDisplayName(fileName));
		});

		it('should parse Figma file urls pointing to a branch', () => {
			const fileKey = generateFigmaFileKey();
			const nodeId = generateFigmaNodeId();
			const branchFileKey = generateFigmaFileKey();

			const fileName = 'Design1';
			const designId = new FigmaDesignIdentifier(branchFileKey, nodeId);

			const result = figmaBackfillService.buildMinimalDesignFromUrl(
				new URL(
					`https://www.figma.com/file/${fileKey}/branch/${branchFileKey}/${fileName}?node-id=${nodeId}`,
				),
			);

			expect(result).toStrictEqual({
				id: designId.toAtlassianDesignId(),
				displayName: fileName,
				url: buildDesignUrl(designId).toString(),
				liveEmbedUrl: buildLiveEmbedUrl(designId).toString(),
				inspectUrl: buildInspectUrl(designId).toString(),
				status: AtlassianDesignStatus.UNKNOWN,
				type: AtlassianDesignType.NODE,
				lastUpdated: new Date(0).toISOString(),
				updateSequenceNumber: 0,
			});
		});
	});
});
