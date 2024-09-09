import { CauseAwareError } from '../../common/errors';

export class ForbiddenByJiraServiceError extends CauseAwareError {}
export class NotFoundByJiraServiceError extends CauseAwareError {}
