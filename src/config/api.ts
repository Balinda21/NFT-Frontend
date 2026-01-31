/**
 * API Configuration
 * Centralized configuration for all API endpoints
 */

// Backend API Base URL
export const API_BASE_URL = 'https://nft-marketplace-rp8f.onrender.com/api';

// External API URLs
export const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
export const BINANCE_API_URL = 'https://api.binance.com/api/v3';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN_PASSWORD: '/auth/login/password',
    LOGIN_GOOGLE: '/auth/login/google',
    REFRESH_TOKEN: '/auth/refresh-token',
    ME: '/auth/me',
  },
  // Users
  USERS: {
    BALANCE: '/users/balance',
    STATS: '/users/stats',
    PROFILE: '/users/profile',
    PASSWORD: '/users/password',
    DASHBOARD: '/users/dashboard',
  },
  // Wallets
  WALLETS: {
    LIST: '/wallets',
    GET: (id: string) => `/wallets/${id}`,
    CREATE: '/wallets',
    QR: (id: string) => `/wallets/${id}/qr`,
    ADDRESS: (currency: string, network: string) => `/wallets/address/${currency}/${network}`,
  },
  // Transactions
  TRANSACTIONS: {
    LIST: '/transactions',
    GET: (id: string) => `/transactions/${id}`,
    DEPOSIT: '/transactions/deposit',
    WITHDRAW: '/transactions/withdraw',
    PROOF: (id: string) => `/transactions/${id}/proof`,
    STATS: '/transactions/stats',
  },
  // Orders
  ORDERS: {
    LIST: '/orders',
    GET: (id: string) => `/orders/${id}`,
    OPTION: '/orders/option',
    CONTRACT: '/orders/contract',
    AI_QUANTIFICATION: '/orders/ai-quantification',
    CANCEL: (id: string) => `/orders/${id}/cancel`,
    STATS: '/orders/stats',
  },
  // Loans
  LOANS: {
    LIST: '/loans',
    GET: (id: string) => `/loans/${id}`,
    CREATE: '/loans',
    REPAY: (id: string) => `/loans/${id}/repay`,
    AVAILABLE: '/loans/available',
    TERMS: '/loans/terms',
  },
  // Referrals
  REFERRALS: {
    CODE: '/referrals/code',
    STATS: '/referrals/stats',
    HISTORY: '/referrals/history',
    EARNINGS: '/referrals/earnings',
  },
  // Content
  CONTENT: {
    FAQS: '/content/faqs',
    ABOUT_US: '/content/about-us',
  },
  // Chat
  CHAT: {
    SESSION: '/chat/session',
    SESSIONS: '/chat/sessions',
    UNREAD: '/chat/unread',
    MESSAGE: '/chat/message',
    MESSAGES: (sessionId: string) => `/chat/${sessionId}/messages`,
    READ: (sessionId: string) => `/chat/${sessionId}/read`,
  },
  // Admin
  ADMIN: {
    STATS: '/admin/stats',
    ACTIVITY: '/admin/activity',
    USERS: '/admin/users',
    USER_DETAIL: (userId: string) => `/admin/users/${userId}`,
    UPDATE_USER: (userId: string) => `/admin/users/${userId}`,
    TRANSACTIONS: '/admin/transactions',
    APPROVE_TRANSACTION: (transactionId: string) => `/admin/transactions/${transactionId}/approve`,
    REJECT_TRANSACTION: (transactionId: string) => `/admin/transactions/${transactionId}/reject`,
    COMPLETE_TRANSACTION: (transactionId: string) => `/admin/transactions/${transactionId}/complete`,
    ORDERS: '/admin/orders',
    LOANS: '/admin/loans',
    APPROVE_LOAN: (loanId: string) => `/admin/loans/${loanId}/approve`,
    REJECT_LOAN: (loanId: string) => `/admin/loans/${loanId}/reject`,
    REFERRAL_STATS: '/admin/referrals/stats',
  },
  // Upload
  UPLOAD: {
    PROOF: '/upload/proof',
    GET: (fileId: string) => `/upload/${fileId}`,
  },
};

/**
 * Get full API URL
 */
export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

/**
 * Check if running in development mode
 */
export const isDevelopment = __DEV__;

