import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import { TOKEN_STORAGE_KEY } from './communal';

/** 后端标准响应结构 */
export interface ApiResponse<T = unknown> {
    code: number;
    data: T;
    message: string;
}

/**
 * 基于 Axios 的请求配置
 * - rawResponse：是否跳过业务响应结构解析，直接返回响应体
 * - skipAuth：是否携带本地保存的 Bearer Token
 * - successCodes：覆盖默认的业务成功状态码
 */
export interface RequestConfig<D = unknown> extends AxiosRequestConfig<D> {
    rawResponse?: boolean;
    skipAuth?: boolean;
    successCodes?: readonly number[];
}

/** 可从统一请求错误中获取错误信息 */
export interface RequestErrorDetails {
    code?: number;
    data?: unknown;
    status?: number;
}

/** 统一的请求异常，业务错误与网络错误的基本类型 */
export class RequestError extends Error {
    /** 后端业务状态码 */
    readonly code?: number;
    /** 后端返回的原始响应体 */
    readonly data?: unknown;
    /** HTTP 状态码 */
    readonly status?: number;

    constructor(message: string, details: RequestErrorDetails = {}) {
        super(message);
        this.name = 'RequestError';
        this.code = details.code;
        this.data = details.data;
        this.status = details.status;
    }
}

export const DEFAULT_SUCCESS_CODES = [200] as const;

/** 判断是否为对象 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

/** 是否属于 ApiResponse 类型 */
function isApiResponse(value: unknown): value is ApiResponse {
    return isRecord(value) && typeof value.code === 'number';
}

/** 获取响应体中的提示信息 */
function getMessage(value: unknown): string | undefined {
    if (!isRecord(value) || typeof value.message !== 'string') {
        return undefined;
    }

    return value.message.trim() || undefined;
}

/** 常用状态码映射提示信息 */
function getHttpErrorMessage(status?: number): string {
    const messages: Record<number, string> = {
        400: '请求参数错误',
        401: '登录状态已失效，请重新登录',
        403: '没有访问权限',
        404: '请求资源不存在',
        408: '请求超时，请稍后重试',
        429: '请求过于频繁，请稍后重试',
        500: '服务器错误',
        502: '服务暂时不可用',
        503: '服务暂时不可用',
        504: '网关超时，请稍后重试',
    };

    return status ? (messages[status] ?? `请求失败 (${status})`) : '网络连接失败，请检查网络后重试';
}

/**
 * Axios 请求客户端
 */
export class Request {
    private readonly instance: AxiosInstance;

    constructor(config: AxiosRequestConfig) {
        this.instance = axios.create(config);

        /** 请求拦截 */
        this.instance.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                const requestConfig = config as InternalAxiosRequestConfig & RequestConfig;
                const token = typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_STORAGE_KEY);

                // 有 token 并且配置了禁止自动携带时手动添加
                if (token && !requestConfig.skipAuth) {
                    config.headers.Authorization = `Bearer ${token}`;
                }

                return config;
            },
            (error) => Promise.reject(error),
        );

        /** 响应拦截 */
        this.instance.interceptors.response.use(
            (response) => response,
            (error) => {
                if (axios.isAxiosError(error) && error.response?.status === 401 && typeof window !== 'undefined') {
                    localStorage.removeItem(TOKEN_STORAGE_KEY);

                    if (window.location.pathname !== '/login') {
                        const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
                        window.location.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
                    }
                }

                return Promise.reject(this.toRequestError(error));
            },
        );
    }

    /** 发送自定义 HTTP 请求 */
    async request<T>(config: RequestConfig): Promise<T> {
        const response = await this.instance.request<T>(config);
        return this.handleResponse<T>(response);
    }

    /** 发送 GET 请求 */
    get<Q = unknown, T = unknown>(url: string, params?: Q, config?: RequestConfig): Promise<T> {
        return this.request<T>({ ...config, method: 'get', params: params ?? config?.params, url });
    }

    /** 发送 POST 请求 */
    post<Q = unknown, T = unknown>(url: string, data?: Q, config?: RequestConfig): Promise<T> {
        return this.request<T>({ ...config, data: data === undefined ? config?.data : data, method: 'post', url });
    }

    /** 发送 PUT 请求 */
    put<Q = unknown, T = unknown>(url: string, data?: Q, config?: RequestConfig): Promise<T> {
        return this.request<T>({ ...config, data: data === undefined ? config?.data : data, method: 'put', url });
    }

    /** 发送 PATCH 请求 */
    patch<Q = unknown, T = unknown>(url: string, data?: Q, config?: RequestConfig): Promise<T> {
        return this.request<T>({ ...config, data: data === undefined ? config?.data : data, method: 'patch', url });
    }

    /** 发送 DELETE 请求 */
    delete<Q = unknown, T = unknown>(url: string, params?: Q, config?: RequestConfig): Promise<T> {
        return this.request<T>({ ...config, method: 'delete', params: params ?? config?.params, url });
    }

    /** 解析响应体内容直接得到对应结果 */
    private handleResponse<T>(response: AxiosResponse<T> | AxiosResponse<ApiResponse<T>>): Promise<T> {
        const config = response.config as RequestConfig;

        // 非常规返回类型就直接返回
        if (!isApiResponse(response.data)) {
            return Promise.resolve(response.data);
        }

        // 否则就值返回 data
        const { code, data, message } = response.data;
        const successCodes = config.successCodes ?? DEFAULT_SUCCESS_CODES;
        if (successCodes.includes(code)) {
            return Promise.resolve(data);
        }

        throw new RequestError(message || '请求处理失败', { code, data, status: response.status });
    }

    /** 错误信息处理，根据不同错误状态返回不同错误信息 */
    private toRequestError(error: unknown): RequestError {
        if (!axios.isAxiosError(error)) {
            return error instanceof RequestError ? error : new RequestError('请求发生未知错误');
        }

        const status = error.response?.status;
        const data = error.response?.data;
        const message =
            getMessage(data) ?? (error.code === 'ERR_CANCELED' ? '请求已取消' : getHttpErrorMessage(status));
        return new RequestError(message, { data, status });
    }
}

/** 使用单例模式创建独立的请求实例 */
export function createRequest(config: AxiosRequestConfig): Request {
    return new Request(config);
}

/** 应用默认请求配置 */
const defaultConfig: AxiosRequestConfig = {
    baseURL: import.meta.env.VITE_API_BASE_URL || '',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    timeout: 10_000,
};

export const request = createRequest(defaultConfig);
