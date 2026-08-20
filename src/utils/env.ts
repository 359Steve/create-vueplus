export class GetEnv {
    getEnv(key: EnvKey) {
        return window.ENV[key];
    }
}
