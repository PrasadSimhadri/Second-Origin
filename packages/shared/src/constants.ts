// ===========================================
// ScanKart Constants
// ===========================================

// API Endpoints
export const API_ENDPOINTS = {
    // Auth
    AUTH_REGISTER: '/auth/register',
    AUTH_LOGIN: '/auth/login',
    AUTH_LOGOUT: '/auth/logout',
    AUTH_REFRESH: '/auth/refresh',
    AUTH_ME: '/auth/me',

    // Products
    PRODUCTS: '/products',
    PRODUCT_BY_BARCODE: '/products/barcode',

    // Bills
    BILLS: '/bills',
    BILL_QR: '/bills/:id/qr',
    BILL_VALIDATE: '/bills/:id/validate',
    BILL_PAY: '/bills/:id/pay',

    // Flags
    FLAGS: '/flags',
    FLAG_EVIDENCE: '/flags/:id/evidence',
    FLAG_RESOLVE: '/flags/:id/resolve',

    // Contradictions
    CONTRADICTIONS: '/contradictions',
    CONTRADICTION_RESOLVE: '/contradictions/:id/resolve',

    // Admin
    ADMIN_THRESHOLDS: '/admin/thresholds',
    ADMIN_ANALYTICS: '/admin/analytics',
    ADMIN_USERS: '/admin/users',
    ADMIN_AUDIT: '/admin/audit',

    // Voice
    VOICE_TOKEN: '/voice/token',
    VOICE_COMMAND: '/voice/command',
} as const;

// Flag Reasons with Labels
export const FLAG_REASONS = {
    item_mismatch: 'Item Mismatch',
    quantity_mismatch: 'Quantity Mismatch',
    suspected_theft: 'Suspected Theft',
    invalid_qr: 'Invalid QR Code',
    other: 'Other',
} as const;

// Contradiction Reasons
export const CONTRADICTION_REASONS = [
    'Items were correctly scanned',
    'Guard made counting error',
    'Items were in my bag from before',
    'Technical error with scanner',
    'Other reason',
] as const;

// Bill Status Labels
export const BILL_STATUS_LABELS = {
    pending: 'Pending',
    paid: 'Paid',
    verified: 'Verified',
    flagged: 'Flagged',
    disputed: 'Disputed',
} as const;

// Bill Status Colors (for UI)
export const BILL_STATUS_COLORS = {
    pending: '#FFA500',
    paid: '#4CAF50',
    verified: '#2196F3',
    flagged: '#F44336',
    disputed: '#9C27B0',
} as const;

// Default Thresholds
export const DEFAULT_THRESHOLDS = {
    priceThreshold: 5000,
    quantityThreshold: 20,
    billValidityMinutes: 30,
    maxFlagsBeforeBlock: 3,
} as const;

// Rate Limits
export const RATE_LIMITS = {
    public: 100,
    authenticated: 200,
    windowMs: 60000,
} as const;

// Voice Commands
export const VOICE_COMMANDS = {
    VERIFY_BILL: ['verify bill', 'verify this bill', 'check bill', 'scan bill'],
    FLAG_CUSTOMER: ['flag customer', 'flag this customer', 'flag bill', 'report'],
    ADD_EVIDENCE: ['add evidence', 'add photo', 'take photo', 'upload image'],
    LIST_ITEMS: ['what items', 'list items', 'show items', 'read items'],
    GET_TOTAL: ['total amount', 'what is the total', 'how much', 'bill amount'],
    COUNT_ITEMS: ['how many items', 'item count', 'number of items'],
    HELP: ['help', 'what can you do', 'commands'],
    CANCEL: ['cancel', 'stop', 'never mind', 'go back'],
    CONFIRM: ['yes', 'confirm', 'proceed', 'okay', 'ok'],
    DENY: ['no', 'cancel', 'don\'t', 'stop'],
} as const;

// Product Categories
export const PRODUCT_CATEGORIES = [
    'Groceries',
    'Dairy',
    'Snacks',
    'Beverages',
    'Personal Care',
    'Household',
    'Frozen',
    'Bakery',
    'Fruits & Vegetables',
    'Meat & Seafood',
] as const;

// Storage Buckets
export const STORAGE_BUCKETS = {
    EVIDENCE: 'evidence',
    AVATARS: 'avatars',
    PRODUCTS: 'products',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
    UNAUTHORIZED: 'You must be logged in to access this resource',
    FORBIDDEN: 'You do not have permission to access this resource',
    NOT_FOUND: 'The requested resource was not found',
    RATE_LIMITED: 'Too many requests. Please try again later',
    INVALID_TOKEN: 'Invalid or expired authentication token',
    INVALID_QR: 'Invalid or expired QR code',
    THRESHOLD_EXCEEDED: 'Scan-and-Pay not allowed: threshold exceeded',
    BILL_ALREADY_VERIFIED: 'This bill has already been verified',
    BILL_NOT_PAID: 'Bill must be paid before verification',
    USER_BLOCKED: 'Your account has been blocked. Please contact support',
} as const;
