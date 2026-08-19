import { RequestUser } from './request-user';

declare global {
    namespace Express {
        interface Request {
            user?: RequestUser;
        }
    }
}

export { };