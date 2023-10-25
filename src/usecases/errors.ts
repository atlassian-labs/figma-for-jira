/**
 * Contains application-level errors describing the result of a failed business operation (use case).
 * Consider using these errors in use cases or routes (e.g. to throw an error early from a middleware).
 * These errors should be directly map to the result (e.g., HTTP code in case of REST API).
 */
import { CauseAwareError } from '../common/errors';

export class ResultError extends CauseAwareError {}

export class BadRequestResultError extends ResultError {}

export class UnauthorizedResultError extends ResultError {}

export class ForbiddenResultError extends ResultError {}
