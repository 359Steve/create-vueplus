/// <reference types="vite/client" />

declare const __APP_ENV__: Record<EnvKey, string>;

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
