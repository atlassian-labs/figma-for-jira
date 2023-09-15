import type { FigmaDesignIdentity } from './figma-design-identity';

export type AssociatedFigmaDesign = {
	readonly id: number;
	readonly designId: FigmaDesignIdentity;
	readonly connectInstallationId: number;
};

export type AssociatedFigmaDesignCreateParams = Omit<
	AssociatedFigmaDesign,
	'id'
>;
