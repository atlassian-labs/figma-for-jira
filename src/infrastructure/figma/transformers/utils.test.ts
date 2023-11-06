import { buildLiveEmbedUrl, getUpdateSequenceNumberFrom } from './utils';

import * as configModule from '../../../config';
import { mockConfig } from '../../../config/testing';
import {
	generateFigmaDesignUrl,
	generateFigmaFileKey,
	generateFigmaFileName,
	generateFigmaNodeId,
} from '../../../domain/entities/testing';

jest.mock('../../../config', () => {
	return {
		...jest.requireActual('../../../config'),
		getConfig: jest.fn(),
	};
});

describe('utils', () => {
	describe('buildLiveEmbedUrl', () => {
		beforeEach(() => {
			(configModule.getConfig as jest.Mock).mockReturnValue(mockConfig);
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should return a correctly formatted url', () => {
			const fileKey = generateFigmaFileKey();
			const fileName = generateFigmaFileName();
			const nodeId = generateFigmaNodeId();
			const inspectUrl = generateFigmaDesignUrl({
				fileKey,
				fileName,
				nodeId,
				mode: 'dev',
			});
			const expected = new URL('https://www.figma.com/embed');
			expected.searchParams.append('embed_host', 'figma-jira-add-on');
			expected.searchParams.append('url', inspectUrl);

			const result = buildLiveEmbedUrl({
				fileKey,
				fileName,
				nodeId,
			});

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
