import {
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
	getUpdateSequenceNumberFrom,
} from './utils';

import * as configModule from '../../../config';
import { mockConfig } from '../../../config/testing';
import {
	generateFigmaDesignUrl,
	generateFigmaFileKey,
	generateFigmaNodeId,
} from '../../../domain/entities/testing';

jest.mock('../../../config', () => {
	return {
		...jest.requireActual('../../../config'),
		getConfig: jest.fn(),
	};
});

describe('utils', () => {
	beforeEach(() => {
		(configModule.getConfig as jest.Mock).mockReturnValue({
			...mockConfig,
			figma: {
				...mockConfig.figma,
				webBaseUrl: 'https://www.figma.com',
			},
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('buildDesignUrl', () => {
		it('should return a url for Figma file', () => {
			const fileKey = generateFigmaFileKey();

			const result = buildDesignUrl({ fileKey });

			expect(result).toEqual(`https://www.figma.com/file/${fileKey}`);
		});

		it('should return a url for Figma node', () => {
			const fileKey = generateFigmaFileKey();
			const nodeId = '1:3';

			const result = buildDesignUrl({ fileKey, nodeId });

			expect(result).toEqual(
				`https://www.figma.com/file/${fileKey}?node-id=1%3A3`,
			);
		});
	});

	describe('buildInspectUrl', () => {
		it('should return a url for Figma file', () => {
			const fileKey = generateFigmaFileKey();

			const result = buildInspectUrl({ fileKey });

			expect(result).toEqual(`https://www.figma.com/file/${fileKey}?mode=dev`);
		});

		it('should return a url for Figma node', () => {
			const fileKey = generateFigmaFileKey();
			const nodeId = '1:3';

			const result = buildInspectUrl({ fileKey, nodeId });

			expect(result).toEqual(
				`https://www.figma.com/file/${fileKey}?node-id=1%3A3&mode=dev`,
			);
		});
	});

	describe('buildLiveEmbedUrl', () => {
		beforeEach(() => {
			(configModule.getConfig as jest.Mock).mockReturnValue(mockConfig);
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should return a url', () => {
			const fileKey = generateFigmaFileKey();
			const nodeId = generateFigmaNodeId();

			const result = buildLiveEmbedUrl({ fileKey, nodeId });

			const expected = new URL('https://www.figma.com/embed');
			expected.search = new URLSearchParams({
				embed_host: 'figma-jira-add-on',
				url: generateFigmaDesignUrl({
					fileKey,
					nodeId,
					mode: 'dev',
				}),
			}).toString();

			expect(result).toEqual(expected.toString());
		});
	});

	describe('getUpdateSequenceNumberFrom', () => {
		it('should return timestamp of given date truncated to milliseconds', () => {
			const result = getUpdateSequenceNumberFrom('2023-11-05T23:08:49.123Z');

			expect(result).toEqual(new Date('2023-11-05T23:08:49Z').getTime());
		});
	});
});
