export function popup(url: string) {
	const openedPopup = window.open(url, '_blank');
	if (
		!openedPopup ||
		openedPopup.closed ||
		typeof openedPopup.closed === 'undefined'
	) {
		return null;
	}
	return openedPopup;
}
