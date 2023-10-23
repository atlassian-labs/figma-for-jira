export const getCurrentUser = (): Promise<{ atlassianAccountId: string }> =>
	new Promise((resolve) => {
		return AP.user.getCurrentUser((user: { atlassianAccountId: string }) => {
			resolve(user);
		});
	});

export const getCurrentSite = (): Promise<string> =>
	new Promise((resolve, reject) => {
		return AP.getLocation((location) => {
			try {
				const url = new URL(location);
				resolve(url.host);
			} catch (e) {
				reject(e);
			}
		});
	});
