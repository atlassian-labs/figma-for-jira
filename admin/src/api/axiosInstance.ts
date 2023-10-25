import axios from 'axios';

const THIRTY_SECONDS_IN_MS = 30_000;
const axiosRest = axios.create({
	timeout: THIRTY_SECONDS_IN_MS,
});
// Adding the token in the headers through interceptors because it is an async value
axiosRest.interceptors.request.use(async (config) => {
	config.headers.Authorization = `JWT ${await AP.context.getToken()}`;
	return config;
});

export { axiosRest };
