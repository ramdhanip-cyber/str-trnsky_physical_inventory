import axios from 'axios';

// Automatically detect the API base URL from the current window location
const getAPIBaseURL = () => {
  // If we're in development (localhost), use the development server
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5310';
  }
  
  // For production, use the same hostname with port 5310
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  // Use the same hostname with port 5310 for the API server
  // Extract the base path from the current URL (same logic as App.tsx)
  const baseUrl = window.location.pathname.split('/star-inventory/')[0] || '';
  const basePath = baseUrl + '/star-inventory';
  
  // Use the same hostname without specifying port
  // const apiBaseURL = `${protocol}//${hostname}:5310`; // For development
  const apiBaseURL = `${protocol}//${hostname}${basePath}`; // For production
  // Debug logging
  console.log('API Base URL Debug:', {
    protocol,
    hostname,
    fullApiBaseURL: apiBaseURL
  });
  
  return apiBaseURL;
};

const API_BASE_URL = getAPIBaseURL();
console.log('Auto-detected API_BASE_URL:', API_BASE_URL);

const defaultOptions = {
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
};

const api = axios.create(defaultOptions);

// Enhanced request interceptor with multiple tokens and headers
api.interceptors.request.use(function (config) {
  const token = localStorage.getItem("token");
  const emailtoken = localStorage.getItem("emailToken");
  const mode = localStorage.getItem("mode");
  const accstring = localStorage.getItem("accstring");
  const name = localStorage.getItem("name");
  const selectedRole = localStorage.getItem("Selected Role");
  const selectedUser = localStorage.getItem("User ID");

  // Set Authorization header for token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Set additional custom headers
  config.headers.token = token ? `${token}` : "";
  config.headers.mode = mode ? `${mode}` : "";
  config.headers.accstring = accstring ? `${accstring}` : "";
  config.headers.name = name ? `${name}` : "";
  config.headers.email = emailtoken ? `${emailtoken}` : "";
  config.headers["x-selected-role"] = selectedRole ? `${selectedRole}` : "";
  config.headers["x-selected-user"] = selectedUser ? `${selectedUser}` : "";

  return config;
});

// Enhanced response interceptor with better error handling
api.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    if (error?.response?.status === 401) {
      // Clear all authentication data on unauthorized access
      localStorage.setItem("token", "");
      localStorage.setItem("accstring", "");
      localStorage.removeItem('token');
      localStorage.removeItem('emailToken');
      localStorage.removeItem('mode');
      localStorage.removeItem('name');
      window.location.href = `/login`;
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (user_name: string, password: string) => 
    api.post('/services/auth/login', { user_name, password }),
  logout: () => api.post('/services/auth/logout'),
  signup: (data: unknown) => api.post('/services/auth/register', data),
  getRoles: () => api.get('/services/roles'),
};

export const servicesAPI = {
  // Locations
  getLocations: () => api.get('/services/locations'),
  getLocation: (id: string) => api.get(`/services/locations/${id}`),
  createLocation: (data: unknown) => api.post('/services/locations', data),
  getItemGroups: (locationId: string) => api.get(`/services/locations/${locationId}/item-groups`),
  
  // Sections
  getSections: (locationId: string) => api.get(`/services/sections?location_id=${locationId}`),
  getSectionCount: (locationId: string) => api.get(`/services/locations/${locationId}/sections`),
  createSection: (data: unknown) => api.post('/services/sections', data),
  deleteSection: (id: string) => api.delete(`/services/sections/${id}`),
  
  // Teams
  getTeams: () => api.get('/services/teams'),
  getTeam: (id: string) => api.get(`/services/teams/${id}`),
  createTeam: (data: unknown) => api.post('/services/teams', data),
  updateTeam: (id: string, data: unknown) => api.put(`/services/teams/${id}`, data),
  deleteTeam: (id: string) => api.delete(`/services/teams/${id}`),
  getTeamsWithMembers: () => api.get('/services/teams-with-members'),
  getTeamTagRange: (teamId: string) => api.get(`/services/teams/${teamId}/tag-range`),
  
  // Items
  getItems: () => api.get('/services/items'),
  getForms: (locationId: string) => api.get(`/services/forms/${locationId}`),
  getCombinations: (params: unknown) => api.get('/services/inventory-analysis', { params }),
  getInventoryDetails: (form: string, params: unknown) => api.get(`/services/inventory-details/${form}`, { params }),
  getInventoryDetailsByTypeQuality: (form: string, params: unknown) => api.get(`/services/inventory-details-type-quality/${form}`, { params }),
  getTotalFormValues: () => api.get('/services/forms/total-values'),
  
  // Users
  getUsers: () => api.get('/services/users'),
  createUser: (data: unknown) => api.post('/services/users', data),
  deleteUser: (id: string) => api.delete(`/services/users/${id}`),
  updateUser: (id: string, data: unknown) => api.post(`/services/users/${id}`, data),
  getRoles: () => api.get('/services/roles'),
  
  // Forms and Assignments
  getAssignedLocations: () => api.get('/services/assigned-locations'),
  getLocationSummary: () => api.get('/services/location-summary'),
  getAssignedItems: (locationId: string) => api.get(`/services/assigned-items/${locationId}`),
  getAssignedItemsTotalAmount: (locationId: string) => api.get(`/services/assigned-items/${locationId}/total-amount`),
  getOverallWeightAndAmount: (branch: string, warehouse: string) => api.get(`/services/overall-weight-amount?branch=${branch}&warehouse=${warehouse}`),
  assignForms: (data: unknown) => api.post('/services/assign-forms', data),
  deleteAssignedItem: (locationId: string, itemId: string) => api.delete(`/services/assigned-items/${locationId}/${itemId}`),
  deleteAssignedLocation: (locationId: string) => api.delete(`/services/assigned-items/${locationId}`),
  assignTeam: (data: unknown) => api.post('/services/assign-team', data),
  unassignTeam: (locationId: string, sectionId: string) => api.delete(`/services/assign-team/${locationId}/${sectionId}`),
  
  // Item Group Analytics
  // getItemGroupAnalytics: (locationId: string) => api.get(`/services/item-group-analytics/${locationId}`),
  
  // Checker and Counter specific
  getCheckerLocations: (userId: string) => api.get(`/services/checker?user_id=${userId}`),
  getCounterLocations: (userId: string) => api.get(`/services/counter?user_id=${userId}`),
  getCheckerSku: (params: unknown) => api.get('/services/checker-sku', { params }),
  getCounterSku: (params: unknown) => api.get('/services/counter-sku', { params }),
  verifyItem: (data: unknown) => api.post('/services/verify-item', data),
  countItem: (data: unknown) => api.post('/services/count-item', data),
  
  // Transactions
  getTransactions: (params: unknown) => api.get('/services/transactions', { params }),
  createTransaction: (data: unknown) => api.post('/services/transactions', data),
  
  // Options and Lookups
  getGrade: (params: unknown) => api.get('/services/grade', { params }),
  getSize: (params: unknown) => api.get('/services/size', { params }),
  getFinish: (params: unknown) => api.get('/services/finish', { params }),
  getExtFinish: (params: unknown) => api.get('/services/extfinish', { params }),
  getWidth: (params: unknown) => api.get('/services/width', { params }),
  getLength: (params: unknown) => api.get('/services/length', { params }),
  getMill: (params: unknown) => api.get('/services/mill', { params }),
  getMillByHeat: (params: unknown) => api.get('/services/mill-by-heat', { params }),
  getHeat: (params: unknown) => api.get('/services/heat', { params }),
  getRemarks: () => api.get('/services/remarks'),
  checkDimensionSegment: (params: unknown) => api.get('/services/check-dimension-segment', { params }),
  
  // Dashboard
  getDashboardAnalytics: () => api.get('/services/dashboard-analytics'),
  
  // Branches and Warehouses
  getBranches: () => api.get('/services/branches'),
  getWarehouses: (branch: string) => api.get(`/services/warehouses?branch=${branch}`),
  getAllWarehouses: () => api.get('/services/available-warehouses'),
  getAvailableWarehouses: () => api.get('/services/available-warehouses'),
  getLocationsByWarehouse: (warehouse: string) => api.get(`/services/locations-by-warehouse?warehouse=${encodeURIComponent(warehouse)}`),
  completeAssignedLocation: (locationId: string, sectionId: string, data: unknown) => api.post(`/services/assigned-locations/${locationId}/${sectionId}`, data),
  
  // Review and Reconciliation
  getReviewTransactions: (params: unknown) => api.get('/services/review-transactions', { params }),
  getReviewTransactionsForChecker: (locationId: string, sectionId: string) => api.get(`/services/review-transactions/?location_id=${locationId}&section_id=${sectionId}&usr_role=checker`),
  getReviewTransactionsForCounter: (locationId: string, sectionId: string) => api.get(`/services/review-transactions/?location_id=${locationId}&section_id=${sectionId}&usr_role=counter`),
  enableChecker: (locationId: string, sectionId: string) => api.post(`/services/sections/${locationId}/${sectionId}/enable-checker`, {}),
  enableCheckerSKU: (locationId: string, data: unknown) => api.post(`/services/sections/${locationId}/enable-checker-sku`, data),
  getInventoryReconciliation: (locationId: string, params: unknown) => api.get(`/services/locations/${locationId}/reconciliation`, { params }),
  checkExistingChecker: (params: unknown) => api.get('/services/check-existing-checker', { params }),
  assignChecker: (data: unknown) => api.post('/services/assign-checker', data),
  getReconciliationRecords: (locationId: string) => api.get(`/services/reconciliation-records/${locationId}`),
  getReconciliationRecord: (recordId: string) => api.get(`/services/reconciliation-records/record/${recordId}`),
  createReconciliationRecord: (data: unknown) => api.post('/services/reconciliation-records', data),
  updateReconciliationRecord: (recordId: string, data: unknown) => api.put(`/services/reconciliation-records/${recordId}`, data),
  deleteReconciliationRecord: (recordId: string) => api.delete(`/services/reconciliation-records/${recordId}`),
  reconcileInventory: (data: unknown) => api.post('/services/reconcile', data),
  saveReconciliationWithComparison: (data: unknown) => api.post('/services/reconcile/save', data),
  checkExistingReconciliation: (params: unknown) => api.get('/services/reconcile/check-existing', { params }),
  loadReconciliationData: (recordId: string) => api.get(`/services/reconcile/load/${recordId}`),
  
  // Recheck API methods
  markItemsForRecheck: (data: unknown) => api.post('/services/recheck/mark-items', data),
  getRecheckItems: (locationId: string) => api.get(`/services/recheck/items/${locationId}`),
      updateRecheckItem: (itemId: string, data: unknown) => api.put(`/services/recheck/items/${itemId}`, data),
    completeRecheckItem: (itemId: string, data: unknown) => api.post(`/services/recheck/complete/${itemId}`, data),
  removeFromRecheck: (itemId: string) => api.delete(`/services/recheck/items/${itemId}`),
  updateRecheckItems: (locationId: string, data: unknown) => api.put(`/services/recheck-items/${locationId}`, data),
  deleteRecheckItems: (locationId: string, data: unknown) => api.delete(`/services/recheck-items/${locationId}`, { data }),
  // Checker specific API methods
  getCheckerTransactions: (params: unknown) => api.get('/services/checker/get-transactions', { params }),
  getCheckerTransactionForChecker: (params: unknown) => api.get('/services/checker/TransactionForChecker', { params }),
  getCheckerBundles: (params: unknown) => api.get('/services/checker/bundles', { params }),
  verifyTransaction: (data: unknown) => api.post('/services/checker/verify-transaction', data),
  unverifyTransaction: (data: unknown) => api.post('/services/checker/unverify-transaction', data),
  updateTransaction: (data: unknown) => api.post('/services/checker/update-transaction', data),
  updateTransactionById: (transactionId: string, data: unknown) => api.put(`/services/transactions/${transactionId}`, data),
  getTransactionIdByTagAndLocation: (tagId: string, locationId: string) => api.get(`/services/transactions/by-tag-location?tag_id=${tagId}&location_id=${locationId}`),
  updateCounterTransaction: (data: unknown) => api.post('/services/counter/update-transaction', data),
  updateCheckerStatus: (locationId: string, sectionId: string) => api.post(`/services/assigned-locations/checker/${locationId}/${sectionId}`),
  addLineItem: (data: unknown) => api.post('/services/checker/add-line-item', data),
  getAssignedLocationsForChecker: (locationId: string, sectionId: string) => api.get(`/services/assigned-locations/checker/${locationId}/${sectionId}`),
  getCheckerActivityLogs: (headers?: Record<string, string>) => api.get('/services/checker-activity-logs', { headers }),
  
  // Auth
  signup: (data: unknown) => api.post('/auth/signup', data),
  
  // Get adjustment data
  getAdjustmentData: (data: { selectedItems: any[], branch: string, warehouse: string }) => 
    api.post('/services/adjustment-data', data),
};

export default api; 