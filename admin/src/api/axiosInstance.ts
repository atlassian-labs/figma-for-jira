import axios from 'axios';
import { getAppBasePath } from '../utils';

const THIRTY_SECONDS_IN_MS = 30_000;
const axiosRest = axios.create({
	timeout: THIRTY_SECONDS_IN_MS,
	baseURL: getAppBasePath() ?? undefined,
});
// Adding the token in the headers through interceptors because it is an async value
axiosRest.interceptors.request.use(async (config) => {
	config.headers.Authorization = `JWT ${await AP.context.getToken()}`;
	return config;
});

export { axiosRest };
