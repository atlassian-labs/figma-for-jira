/**
 * Returns a new URL with the given `segment` appended to `url.pathname`.
 */
export const appendToPathname = (url: URL, segment: string): URL => {
	const pathnameWithoutTrailingSlash = url.pathname.replace(/\/$/, '');
	const segmentPathWithoutLeadingSlash = segment.replace(/^\//, '');

	const result = new URL(url.toString());
	result.pathname = [
		pathnameWithoutTrailingSlash,
		segmentPathWithoutLeadingSlash,
	].join('/');

	return result;
};

/**
 * Encodes a URI as {@link encodeURIComponent} and additionally encodes the "-" character.
 *
 * @remarks
 * This encoding is used by Figma for a File name.
 */
export const encodeURIComponentAndDash = (value: string): string => {
	return encodeURIComponent(value).replaceAll('-', '%2D');
};
