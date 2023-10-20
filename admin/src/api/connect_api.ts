export const getCurrentUser = (): Promise<{ atlassianAccountId: string }> =>
	new Promise((resolve) => {
		return AP.user.getCurrentUser((user: { atlassianAccountId: string }) => {
			resolve(user);
		});
	});
