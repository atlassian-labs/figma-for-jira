import { v4 as uuidv4 } from 'uuid';

import { InvalidInputUseCaseResultError } from './errors';
import type { GetDesignByUrlForBackfillUseCaseParams } from './get-design-by-url-for-backfill-use-case';
import { getDesignByUrlForBackfillUseCase } from './get-design-by-url-for-backfill-use-case';

import { flushMacrotaskQueue } from '../common/testing/utils';
import {
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateFigmaDesignUrl,
} from '../domain/entities/testing';
import { figmaBackfillService } from '../infrastructure/figma';
import { submitFullDesign } from '../jobs';

const generateGetDesignByUrlForBackfillUseCaseParams = ({
	designUrl = generateFigmaDesignUrl(),
	atlassianUserId = uuidv4(),
	connectInstallation = generateConnectInstallation(),
} = {}): GetDesignByUrlForBackfillUseCaseParams => ({
	designUrl,
	atlassianUserId,
	connectInstallation,
});

jest.mock('../jobs', () => {
	return {
		...jest.requireActual('../jobs'),
		submitFullDesign: jest.fn(),
	};
});

describe('getDesignByUrlForBackfillUseCase', () => {
	it('should return Design and schedule full Design submission', async () => {
		const figmaDesignId = generateFigmaDesignIdentifier();
		const params = generateGetDesignByUrlForBackfillUseCaseParams({
			designUrl: generateFigmaDesignUrl(figmaDesignId),
		});

		const result = await getDesignByUrlForBackfillUseCase.execute(params);

		expect(result).toStrictEqual(
			figmaBackfillService.buildMinimalDesignFromUrl(params.designUrl),
		);
		await flushMacrotaskQueue();
		expect(submitFullDesign).toHaveBeenCalledWith({
			figmaDesignId,
			atlassianUserId: params.atlassianUserId,
			connectInstallationId: params.connectInstallation.id,
		});
	});

	it('should throw InvalidInputUseCaseResultError when design URL is not valid', async () => {
		const params = generateGetDesignByUrlForBackfillUseCaseParams({
			designUrl: new URL('https://www.figma.com/files'),
		});

		await expect(
			getDesignByUrlForBackfillUseCase.execute(params),
		).rejects.toBeInstanceOf(InvalidInputUseCaseResultError);
	});
});
