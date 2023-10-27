import { CauseAwareError } from '../../common/errors';

export class RepositoryError extends CauseAwareError {}

export class NotFoundRepositoryError extends RepositoryError {}
