import ddTrace from 'dd-trace';

const tracer = ddTrace.init({
	service: process.env.FIGMA_SERVICE_NAME || '',
	profiling: true,
	env: process.env.DD_ENV || '',
	runtimeMetrics: true,
	logInjection: true,
	tags: { figma_service: process.env.FIGMA_SERVICE_NAME || '' },
});

tracer.use('express', {
	enabled: true,
	service: process.env.FIGMA_SERVICE_NAME || '',
});
