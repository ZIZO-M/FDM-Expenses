import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fdm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fdm_token');
      localStorage.removeItem('fdm_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

// Claims (Employee)
export const getMyClaims = () => api.get('/claims');

export const createClaim = (data: {
  currency?: string;
  employeeComment?: string;
}) => api.post('/claims', data);

export const getClaim = (claimId: string) =>
  api.get(`/claims/${claimId}`);

export const updateClaim = (
  claimId: string,
  data: { currency?: string; employeeComment?: string }
) => api.put(`/claims/${claimId}`, data);

export const submitClaim = (claimId: string) =>
  api.post(`/claims/${claimId}/submit`);

export const withdrawClaim = (claimId: string) =>
  api.post(`/claims/${claimId}/withdraw`);

export const deleteClaim = (claimId: string) =>
  api.delete(`/claims/${claimId}`);

// Expense Items
export const addItem = (claimId: string, data: object) =>
  api.post(`/claims/${claimId}/items`, data);

export const updateItem = (itemId: string, data: object) =>
  api.put(`/claims/items/${itemId}`, data);

export const deleteItem = (itemId: string) =>
  api.delete(`/claims/items/${itemId}`);

// Receipts
export const uploadReceipt = (itemId: string, formData: FormData) =>
  api.post(`/claims/items/${itemId}/receipts`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteReceipt = (receiptId: string) =>
  api.delete(`/claims/receipts/${receiptId}`);

// Manager
export const getManagerPendingClaims = () =>
  api.get('/manager/claims');

export const getManagerClaim = (claimId: string) =>
  api.get(`/manager/claims/${claimId}`);

export const approveClaim = (claimId: string, comment?: string) =>
  api.post(`/manager/claims/${claimId}/approve`, { comment });

export const rejectClaim = (claimId: string, comment: string) =>
  api.post(`/manager/claims/${claimId}/reject`, { comment });

export const requestChanges = (claimId: string, comment: string) =>
  api.post(`/manager/claims/${claimId}/request-changes`, { comment });

// Finance
export const getFinanceApprovedClaims = () =>
  api.get('/finance/claims');

export const getFinanceClaim = (claimId: string) =>
  api.get(`/finance/claims/${claimId}`);

export const processReimbursement = (
  claimId: string,
  data: { paymentReference?: string; financeComment?: string }
) => api.post(`/finance/claims/${claimId}/reimburse`, data);

export default api;