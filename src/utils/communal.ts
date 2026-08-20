import { GetEnv } from './env';
import { TokenExpired } from './jwt';

export const TOKEN_STORAGE_KEY = 'gcs-token';

export class CommunalFunction {
    readonly jwt = new TokenExpired();
    readonly env = new GetEnv();
}

export const communalFunction = new CommunalFunction();
