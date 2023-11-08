import ddTrace from 'dd-trace';

import { getConfig } from '../config/config';

const tracer = ddTrace.init({
	service: getConfig().tracer.service,
	profiling: true,
	env: getConfig().tracer.env,
	runtimeMetrics: true,
	logInjection: true,
	tags: { figma_service: getConfig().tracer.service },
});

tracer.use('express', {
	enabled: true,
	service: getConfig().tracer.service,
});
