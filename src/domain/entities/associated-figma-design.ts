import type { FigmaDesignIdentifier } from './figma-design-identifier';

export type AssociatedFigmaDesign = {
	readonly id: number;
	readonly designId: FigmaDesignIdentifier;
	readonly connectInstallationId: number;
};

export type AssociatedFigmaDesignCreateParams = Omit<
	AssociatedFigmaDesign,
	'id'
>;
