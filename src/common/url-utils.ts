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
