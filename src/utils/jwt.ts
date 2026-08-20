import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
    exp: number;
    iat: number;
}

export class TokenExpired {
    /** 验证 token 是否过期 */
    isTokenExpired(token: string): boolean {
        if (!token) {
            return true;
        }

        try {
            const { exp } = jwtDecode<JwtPayload>(token);

            return typeof exp !== 'number' || exp * 1000 <= Date.now();
        } catch {
            return true;
        }
    }
}
