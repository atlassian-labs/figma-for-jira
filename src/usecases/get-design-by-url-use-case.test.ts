import { v4 as uuidv4 } from 'uuid';

import {
	FigmaDesignNotFoundUseCaseResultError,
	InvalidInputUseCaseResultError,
} from './errors';
import type { GetDesignByUrlUseCaseParams } from './get-design-by-url-use-case';
import { getDesignByUrlUseCase } from './get-design-by-url-use-case';

import {
	generateAtlassianDesign,
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateFigmaDesignUrl,
} from '../domain/entities/testing';
import { figmaService } from '../infrastructure/figma';

const generateGetDesignByUrlUseCaseParams = ({
	designUrl = generateFigmaDesignUrl(),
	atlassianUserId = uuidv4(),
	connectInstallation = generateConnectInstallation(),
} = {}): GetDesignByUrlUseCaseParams => ({
	designUrl,
	atlassianUserId,
	connectInstallation,
});

describe('getDesignByUrlUseCase', () => {
	it('should return Design', async () => {
		const figmaDesignId = generateFigmaDesignIdentifier();
		const design = generateAtlassianDesign({
			id: figmaDesignId.toAtlassianDesignId(),
		});
		const params = generateGetDesignByUrlUseCaseParams({
			designUrl: generateFigmaDesignUrl(figmaDesignId),
		});
		jest.spyOn(figmaService, 'getDesignOrParent').mockResolvedValue(design);

		const result = await getDesignByUrlUseCase.execute(params);

		expect(result).toStrictEqual(design);
		expect(figmaService.getDesignOrParent).toHaveBeenCalledWith(figmaDesignId, {
			atlassianUserId: params.atlassianUserId,
			connectInstallationId: params.connectInstallation.id,
		});
	});

	it('should throw InvalidInputUseCaseResultError when design URL is not valid', async () => {
		const params = generateGetDesignByUrlUseCaseParams({
			designUrl: new URL('https://www.figma.com/files'),
		});

		await expect(getDesignByUrlUseCase.execute(params)).rejects.toBeInstanceOf(
			InvalidInputUseCaseResultError,
		);
	});

	it('should throw FigmaDesignNotFoundUseCaseResultError when Design is not found', async () => {
		const figmaDesignId = generateFigmaDesignIdentifier();
		const params = generateGetDesignByUrlUseCaseParams({
			designUrl: generateFigmaDesignUrl(figmaDesignId),
		});
		jest.spyOn(figmaService, 'getDesignOrParent').mockResolvedValue(null);

		await expect(getDesignByUrlUseCase.execute(params)).rejects.toBeInstanceOf(
			FigmaDesignNotFoundUseCaseResultError,
		);
	});
});
