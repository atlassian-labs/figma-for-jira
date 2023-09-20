import { buildLiveEmbedUrl } from './utils';

import * as configModule from '../../../config';
import { mockConfig } from '../../../config/testing';
import { generateFigmaDesignUrl } from '../../../domain/entities/testing';
import {
	MOCK_FILE_KEY,
	MOCK_FILE_NAME,
	MOCK_NODE_ID,
} from '../figma-client/testing';

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
		const inspectUrl = generateFigmaDesignUrl({
			fileKey: MOCK_FILE_KEY,
			nodeId: MOCK_NODE_ID,
			fileName: MOCK_FILE_NAME,
			mode: 'dev',
		});
		const expected = new URL('https://www.figma.com/embed');
		expected.searchParams.append('embed_host', 'atlassian');
		expected.searchParams.append('url', inspectUrl);
		expect(
			buildLiveEmbedUrl({
				fileKey: MOCK_FILE_KEY,
				fileName: MOCK_FILE_NAME,
				nodeId: MOCK_NODE_ID,
			}),
		).toEqual(expected.toString());
	});
});
