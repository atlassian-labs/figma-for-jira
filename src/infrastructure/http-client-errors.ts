import { CauseAwareError } from '../common/errors';

export class HttpClientError extends CauseAwareError {}

export class NotFoundHttpClientError extends HttpClientError {}

export class UnauthorizedHttpClientError extends HttpClientError {}

export class ForbiddenHttpClientError extends HttpClientError {}
