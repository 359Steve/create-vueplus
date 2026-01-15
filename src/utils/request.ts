import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
// src/utils/request.ts
import axios from 'axios';

// 定义接口返回数据的通用格式（根据后端调整）
interface ApiResponse<T = any> {
    code: number;
    data: T;
    message: string;
}

class Request {
    private instance: AxiosInstance;

    constructor(config: AxiosRequestConfig) {
        this.instance = axios.create(config);

        // 请求拦截器
        this.instance.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                // 在这里可以添加全局请求逻辑，例如：
                // 1. 添加 token
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }

                // 2. 添加全局参数
                // config.params = { ...config.params, timestamp: Date.now() }

                return config;
            },
            (error) => {
                return Promise.reject(error);
            },
        );

        // 响应拦截器
        this.instance.interceptors.response.use(
            (response: AxiosResponse<ApiResponse>) => {
                // 对响应数据做统一处理
                if (response.data.code !== 200) {
                    // 处理业务逻辑错误（例如 token 过期）
                    return Promise.reject(response.data);
                }
                return response.data.data; // 直接返回有用的数据部分
            },
            (error) => {
                // 处理 HTTP 错误（如 404, 500 等）
                let message = '';
                if (error.response) {
                    switch (error.response.status) {
                        case 401:
                            message = '未授权，请重新登录';
                            // 跳转到登录页
                            break;
                        case 404:
                            message = '请求资源不存在';
                            break;
                        case 500:
                            message = '服务器错误';
                            break;
                        default:
                            message = `网络错误 (${error.response.status})`;
                    }
                } else {
                    message = '网络连接失败';
                }

                // 可以在这里使用 UI 提示库（如 Element Plus 的 ElMessage）
                console.error(message);
                return Promise.reject(error);
            },
        );
    }

    // 封装通用请求方法
    public request<T>(config: AxiosRequestConfig): Promise<T> {
        return this.instance.request(config);
    }

    // 封装 GET 方法
    public get<T>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.instance.get(url, { params, ...config });
    }

    // 封装 POST 方法
    public post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.instance.post(url, data, config);
    }

    // 封装 PUT 方法
    public put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.instance.put(url, data, config);
    }

    // 封装 DELETE 方法
    public delete<T>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.instance.delete(url, { params, ...config });
    }
}

// 创建默认实例（可根据需要创建多个不同配置的实例）
const defaultConfig: AxiosRequestConfig = {
    baseURL: import.meta.env.VITE_API_BASE_URL, // 从环境变量读取
    timeout: 10000, // 10秒超时
    headers: {
        'Content-Type': 'application/json;charset=UTF-8',
    },
};

export const request = new Request(defaultConfig);
