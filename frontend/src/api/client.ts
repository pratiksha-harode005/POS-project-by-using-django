import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios'

const API_BASE_URL = `http://${window.location.hostname}:8000/api`

const rawAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Attach JWT Bearer Token
rawAxios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response Interceptor: Auto Token Refresh on 401
rawAxios.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          })
          localStorage.setItem('access_token', res.data.access)
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`
          return rawAxios(originalRequest)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user_role')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// ── In-Memory API Cache & In-Flight Request Deduplication ───────────────────────
const _apiCache = new Map<string, { data: any; timestamp: number }>()
const _inFlightRequests = new Map<string, Promise<AxiosResponse<any>>>()
const CACHE_TTL_MS = 5000 // 5 seconds cache for instant tab transitions

export function invalidateApiCache(resourcePrefix?: string) {
  if (!resourcePrefix) {
    _apiCache.clear()
    return
  }
  for (const key of _apiCache.keys()) {
    if (key.includes(resourcePrefix)) {
      _apiCache.delete(key)
    }
  }
}

function getCacheKey(url: string, params?: any): string {
  let paramStr = ''
  if (params) {
    try {
      const sortedKeys = Object.keys(params).sort()
      paramStr = '?' + sortedKeys.map(k => `${k}=${params[k]}`).join('&')
    } catch {
      paramStr = '?' + JSON.stringify(params)
    }
  }
  return `${url}${paramStr}`
}

export const apiClient = {
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    const key = getCacheKey(url, config?.params)
    const now = Date.now()

    // 1. Check in-memory fast cache (0ms latency)
    const cached = _apiCache.get(key)
    if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      return {
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config as any || {},
      }
    }

    // 2. Check in-flight duplicate requests (deduplicate identical concurrent calls)
    if (_inFlightRequests.has(key)) {
      return _inFlightRequests.get(key)!
    }

    // 3. Make real network call to backend PostgreSQL API
    const requestPromise = rawAxios.get<T>(url, config).then(res => {
      _apiCache.set(key, { data: res.data, timestamp: Date.now() })
      _inFlightRequests.delete(key)
      return res
    }).catch(err => {
      _inFlightRequests.delete(key)
      throw err
    })

    _inFlightRequests.set(key, requestPromise)
    return requestPromise
  },

  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    invalidateApiCache()
    return rawAxios.post<T>(url, data, config)
  },

  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    invalidateApiCache()
    return rawAxios.put<T>(url, data, config)
  },

  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    invalidateApiCache()
    return rawAxios.patch<T>(url, data, config)
  },

  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    invalidateApiCache()
    return rawAxios.delete<T>(url, config)
  },

  create: rawAxios.create.bind(rawAxios),
  interceptors: rawAxios.interceptors,
  defaults: rawAxios.defaults,
}

