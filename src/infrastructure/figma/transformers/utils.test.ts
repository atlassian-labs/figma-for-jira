import { buildLiveEmbedUrl } from './utils';

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
		expected.searchParams.append('embed_host', 'atlassian');
		expected.searchParams.append('url', inspectUrl);

		const result = buildLiveEmbedUrl({
			fileKey,
			fileName,
			nodeId,
		});

		expect(result).toEqual(expected.toString());
	});
});
