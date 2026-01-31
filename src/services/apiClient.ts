import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

/**
 * API Response Types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  error?: any;
}

export interface ApiError {
  message: string;
  status?: number;
  data?: any;
}

/**
 * Request Options
 */
export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
  skipAuth?: boolean; // Skip adding auth token
}

/**
 * API Client Class
 * Provides a centralized way to make API calls with automatic token injection
 */
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Get auth token from storage
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    let url = `${this.baseURL}${endpoint}`;
    
    if (params && Object.keys(params).length > 0) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');
      url += `?${queryString}`;
    }
    
    return url;
  }

  /**
   * Build headers with auth token
   */
  private async buildHeaders(options?: RequestOptions): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };

    // Add auth token if not skipped
    if (!options?.skipAuth) {
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Handle response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    let data: any;
    try {
      if (isJson) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (error) {
      throw new Error('Failed to parse response');
    }

    if (!response.ok) {
      const error: ApiError = {
        message: data.message || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        data: data,
      };
      throw error;
    }

    // Normalize backend response format to frontend format
    // Backend returns: { status: 'success' | 'error', message: string, data?: T }
    // Frontend expects: { success: boolean, message: string, data?: T }
    if (data && typeof data === 'object' && 'status' in data && !('success' in data)) {
      return {
        success: data.status === 'success',
        message: data.message || '',
        data: data.data,
        error: data.status === 'error' ? data : undefined,
      };
    }

    return data;
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    options?: RequestOptions & { body?: any }
  ): Promise<ApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint, options?.params);
      const headers = await this.buildHeaders(options);

      const fetchOptions: RequestInit = {
        method,
        headers,
        ...(options?.body && { body: JSON.stringify(options.body) }),
      };

      const response = await fetch(url, fetchOptions);
      return await this.handleResponse<T>(response);
    } catch (error: any) {
      if (error.status) {
        // This is an API error we threw
        throw error;
      }
      // Network or other error
      throw {
        message: error.message || 'Network error. Please check your connection.',
        status: 0,
        data: null,
      } as ApiError;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, options);
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, { ...options, body });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, { ...options, body });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, { ...options, body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, options);
  }

  /**
   * Upload file (multipart/form-data)
   */
  async upload<T = any>(
    endpoint: string,
    formData: FormData,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint, options?.params);
      const token = await this.getAuthToken();
      
      const headers: Record<string, string> = {};
      if (token && !options?.skipAuth) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // Don't set Content-Type for FormData, let the browser set it with boundary
      Object.assign(headers, options?.headers || {});

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      return await this.handleResponse<T>(response);
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      throw {
        message: error.message || 'Upload failed',
        status: 0,
        data: null,
      } as ApiError;
    }
  }
}

// Create and export singleton instance
export const api = new ApiClient(API_BASE_URL);

// Export the class for testing or custom instances
export default ApiClient;


