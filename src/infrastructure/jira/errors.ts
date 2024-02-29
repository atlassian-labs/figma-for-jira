import { CauseAwareError } from '../../common/errors';

export class ForbiddenByJiraServiceError extends CauseAwareError {}

export class NotFoundInJiraServiceError extends CauseAwareError {}
