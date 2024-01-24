const pendingExecutions: Array<(value: void) => void> = [];

export const getPendingRouteExecution = () => {
	const pendingRouteExecution = new Promise((resolve) => {
		pendingExecutions.push(resolve);
	});
	return pendingRouteExecution;
};

export const completePendingRouteExecutionForTests = () => {
	pendingExecutions.forEach((resolve) => resolve());
};
