
// const BASE_URL = "http://localhost:8080/api/v1"
// const BASE_URL = "https://api.valiproduce.shop/api/v1"
const BASE_URL = import.meta.env.VITE_APP_BASE_URL;

export const endpoints = {
  LOGIN_API: BASE_URL + "/auth/login",
  VERIFY_LOGIN_OTP_API: BASE_URL + "/auth/verify-login-otp",
  RESEND_LOGIN_OTP_API: BASE_URL + "/auth/resend-login-otp",
  SEND_STORE_ORDER_OTP_API: BASE_URL + "/auth/send-store-order-otp",
  VERIFY_STORE_ORDER_OTP_API: BASE_URL + "/auth/verify-store-order-otp",
  SIGNUP_API: BASE_URL + "/auth/register",
  GET_USER_API: BASE_URL + "/auth/user",
  DELETE_STORE_API: BASE_URL + "/auth/delete-store",
  CREATE_MEMBER_API: BASE_URL + "/auth/member",
  GET_ALL_MEMBER_API: BASE_URL + "/auth/all-members",
  GET_ALL_STORES_API: BASE_URL + "/auth/all-stores",
  UPDATE_MEMBER_PERMISSION_API: BASE_URL + "/auth/update",
  UPDATE_STORE: BASE_URL + "/auth/update-store",
  FETCH_MY_PROFILE_API : BASE_URL + "/auth/fetchMyProfile",
  UPDATE_PASSWORD_API : BASE_URL + "/auth/update-password",
  USER_WITH_ORDER :BASE_URL + "/order/user",
  VENDOR_WITH_ORDER :BASE_URL + "/purchase-orders/user",
  ADD_CHEQUES_API :BASE_URL + "/auth/addcheques",
  EDIT_CHEQUE_API :BASE_URL + "/auth/editscheque",
  GET_CHEQUE_API :BASE_URL + "/auth/cheques",
  DELETE_CHEQUE_API :BASE_URL + "/auth/cheques",
  UPDATE_CHEQUE_STATUS_API :BASE_URL + "/auth/cheques",
  GET_ALL_CHEQUES_API :BASE_URL + "/auth/all-cheques",
  // Store Analytics
  GET_STORE_ANALYTICS_API: BASE_URL + "/auth/store-analytics",
  GET_ALL_STORES_ANALYTICS_API: BASE_URL + "/auth/stores-analytics",
  GET_PAGINATED_PAYMENT_STORES_API: BASE_URL + "/auth/stores-payment-status",
  GET_STORE_ORDERS_PAGINATED_API: BASE_URL + "/auth/store",
  // Store Communication & Payment
  ADD_COMMUNICATION_LOG_API: BASE_URL + "/auth/store",
  GET_COMMUNICATION_LOGS_API: BASE_URL + "/auth/store",
  ADD_PAYMENT_RECORD_API: BASE_URL + "/auth/store",
  GET_PAYMENT_RECORDS_API: BASE_URL + "/auth/store",
  GET_ALL_STORE_PAYMENTS_API: BASE_URL + "/auth/all-store-payments",
  SEND_PAYMENT_REMINDER_API: BASE_URL + "/auth/store",
  SEND_STATEMENT_EMAIL_API: BASE_URL + "/auth/store",
  GET_STATEMENT_DATA_API: BASE_URL + "/auth/store",
}



export const category = {
  CREATE_CATEGORY: BASE_URL + "/category/create",
  GET_CATEGORIES: BASE_URL + "/category/getAll",
  DELETE_CATEGORY: BASE_URL + "/category/delete",
  UPDATE_CATEGORY: BASE_URL + "/category/update",
}

export const product = {
  CREATE_PRODUCT: BASE_URL + "/product/create",

  GET_ALL_PRODUCT: BASE_URL + "/product/getAll",
  GET_ALL_PRODUCT_SUMMARY: BASE_URL + "/product/getAllSummary",
  SEARCH_PRODUCTS: BASE_URL + "/product/getAllSummary",
  GET_PRODUCT: BASE_URL + "/product/get",
  UPDATE_PRODUCT: BASE_URL + "/product/update",
  GET_PRODUCT_ORDER: BASE_URL + "/product/get-order",
  DELETE_PRODUCT: BASE_URL + "/product/delete",
  DELETE_PRODUCT: BASE_URL + "/product/delete",
 TRASH_PRODUCT: BASE_URL + "/product/trash",
 QUANITY_ADD_PRODUCT: BASE_URL + "/product/addQuantity",
  UPDATE_PRODUCT_PRICE: BASE_URL + "/product/update-price",
  UPDATE_BULK_DISCOUNT: BASE_URL + "/product/update-bulk-discounts",
  GET_PRODUCT_BY_STORE: BASE_URL + "/product/get-by-store",
 REFRESH_PRODUCT: BASE_URL + "/product/reset-history",
 CALCULATE_PRODUCT_WEIGHT: BASE_URL + "/product/calculate-weight",
}

export const priceList = {
  CREATE_PRICE_LIST: BASE_URL + "/price-list-templates/create",
  GET_ALL_PRICE_LIST: BASE_URL + "/price-list-templates/getAll",
  GET_PRICE_LIST: BASE_URL + "/price-list-templates/get",
  DELETE_PRICE_LIST: BASE_URL + "/price-list-templates/delete",
  UPDATE_PRICE_LIST: BASE_URL + "/price-list-templates/update",
}

export const groupPricing = {
  CREATE_GROUP_PRICING: BASE_URL + "/pricing/create",
  GET_ALL_GROUP_PRICING: BASE_URL + "/pricing/getAll",
  GET_GROUP_PRICING: BASE_URL + "/pricing/get",
  DELETE_GROUP_PRICING: BASE_URL + "/pricing/delete",
  UPDATE_GROUP_PRICING: BASE_URL + "/pricing/update",

}
export const order = {
  CREATE_ORDER: BASE_URL + "/order/create",

  GET_ALL_ORDER: BASE_URL + "/order/getAll",
  GET_ORDER: BASE_URL + "/order/get",
  DELETE_ORDER: BASE_URL + "/order/delete",
  UPDATE_ORDER: BASE_URL + "/order/update",
  UPDATE_ORDER_ORDER_TYPE: BASE_URL + "/order/update-otype",
  UPDATE_PLATE_ORDER: BASE_URL + "/order/update-plate",
  UPDATE_PAYMENT_ORDER: BASE_URL + "/order/payment-update",
  UPDATE_PAYMENT_UNPAID_ORDER: BASE_URL + "/order/unpaid",
  UPDATE_SHIPPING_COST: BASE_URL + "/order/update-shipping",
  GET_STORE_ORDERS: BASE_URL + "/order/store-orders",
  GET_USERSTATEMENT: BASE_URL + "/order/statement",
  DASHBOARD_DATA: BASE_URL + "/order/dashboard",
  ENHANCED_DASHBOARD_DATA: BASE_URL + "/order/dashboard-enhanced",
  PENDING_ORDER_DATA: BASE_URL + "/order/pending",
  SEND_INVOICE_MAIL: BASE_URL + "/order/invoiceMail",
  ASSIGN_PRODUCT_TO_STORE: BASE_URL + "/order/assign-product",


  HARD_DELETE_ORDER: BASE_URL + "/order/hard-delete", // append /:id when using
  UPDATE_ORDER_QUANTITY : BASE_URL + "/order/update-quantity", 
  GET_USER_LATEST_ORDERS: BASE_URL + "/order/latest", // append /:storeId when using

  // Order Matrix APIs
  GET_ORDER_MATRIX: BASE_URL + "/order/matrix",
  UPDATE_ORDER_MATRIX_ITEM: BASE_URL + "/order/matrix/update",
  UPDATE_PREORDER_MATRIX_ITEM: BASE_URL + "/order/matrix/preorder",
  
  // PreOrder Confirm APIs
  GET_PENDING_PREORDERS: BASE_URL + "/order/matrix/preorders/pending",
  CONFIRM_PREORDERS: BASE_URL + "/order/matrix/preorders/confirm",

  // Regional Order Trends
  GET_REGIONAL_ORDER_TRENDS: BASE_URL + "/order/regional-trends",

}

// Incoming Stock APIs
export const incomingStockEndpoints = {
  GET_INCOMING_STOCK: BASE_URL + "/incoming-stock",
  GET_UNLINKED_INCOMING: BASE_URL + "/incoming-stock/unlinked",
  ADD_INCOMING_STOCK: BASE_URL + "/incoming-stock/add",
  LINK_INCOMING_STOCK: BASE_URL + "/incoming-stock", // append /:id/link
  BULK_LINK_INCOMING: BASE_URL + "/incoming-stock/bulk-link",
  RECEIVE_INCOMING_STOCK: BASE_URL + "/incoming-stock", // append /:id/receive
  DELETE_INCOMING_STOCK: BASE_URL + "/incoming-stock", // append /:id
}

// Work Order APIs
export const workOrderEndpoints = {
  CREATE_WORK_ORDER: BASE_URL + "/work-orders/create",
  GET_WORK_ORDER: BASE_URL + "/work-orders", // append /:id
  GET_WORK_ORDER_BY_WEEK: BASE_URL + "/work-orders",
  GET_ALL_WORK_ORDERS: BASE_URL + "/work-orders/list/all",
  GET_SHORTAGES_SUMMARY: BASE_URL + "/work-orders/shortages/summary",
  UPDATE_PICKING_STATUS: BASE_URL + "/work-orders", // append /:id/picking
  RESOLVE_SHORTAGE: BASE_URL + "/work-orders", // append /:id/resolve-shortage
}

export const crm = {
  CREATE_CONTACT_CRM: BASE_URL + "/crm/create",
  GET_ALL_CONTACT_CRM: BASE_URL + "/crm/getAll",
  UPDATE_CONTACT_CRM: BASE_URL + "/crm/update",
  DELETE_CONTACT_CRM: BASE_URL + "/crm/delete",

  CREATE_MEMBER_CRM: BASE_URL + "/crm/member-create",
  GET_ALL_MEMBER_CRM: BASE_URL + "/crm/member-getAll",
  UPDATE_MEMBER_CRM: BASE_URL + "/crm/member-update",
  DELETE_MEMBER_CRM: BASE_URL + "/crm/member-delete",


}
export const dealCrm = {
  CREATE_DEAL_CRM: BASE_URL + "/crm-deal/create",
  GET_ALL_DEAL_CRM: BASE_URL + "/crm-deal/getAll",
  UPDATE_DEAL_CRM: BASE_URL + "/crm-deal/update",
  DELETE_DEAL_CRM: BASE_URL + "/crm-deal/delete",
}
export const task = {
  CREATE_TASK_CRM: BASE_URL + "/task/create",
  GET_ALL_TASK_CRM: BASE_URL + "/task/getAll",
  UPDATE_TASK_CRM: BASE_URL + "/task/update",
  DELETE_TASK_CRM: BASE_URL + "/task/delete",
}
export const image = {
  IMAGE_UPLOAD: BASE_URL + "/image/multi",
}
export const store = {
  STORE_DASHBOARD: BASE_URL + "/store/dashboard",
  STORE_PRODUCTS: BASE_URL + "/store/products",
  PLACE_ORDER: BASE_URL + "/store/order",
}
export const email = {
  PRICE_LIST: BASE_URL + "/email/price-list",
  PRICE_LIST_MULTI: BASE_URL + "/email/price-list-multi",

}


export const vendor = {
  CREATE_VENDOR: BASE_URL + "/vendors/create",
  GET_ALL_VENDORS: BASE_URL + "/vendors/getAll",
  GET_VENDOR: BASE_URL + "/vendors/get", // append /:id when using
  UPDATE_VENDOR: BASE_URL + "/vendors/update", // append /:id when using
  DELETE_VENDOR: BASE_URL + "/vendors/delete", // append /:id when using
};

export const purchaseOrder = {
  CREATE_PURCHASE_ORDER: BASE_URL + "/purchase-orders/create",
  GET_ALL_PURCHASE_ORDERS: BASE_URL + "/purchase-orders/getAll",
  GET_PURCHASE_ORDER: BASE_URL + "/purchase-orders/get", // append /:id when using
  UPDATE_PURCHASE_ORDER: BASE_URL + "/purchase-orders/update", // append /:id when using
  UPDATE_PURCHASE_QAULITY_ORDER: BASE_URL + "/purchase-orders/update-quality", // append /:id when using
  DELETE_PURCHASE_ORDER: BASE_URL + "/purchase-orders/delete", // append /:id when using
  PAYMENT_PURCHASE_ORDER: BASE_URL + "/purchase-orders/update-payment", // append /:id when using
  // Accounting
  APPLY_CREDIT: BASE_URL + "/purchase-orders/apply-credit", // append /:purchaseOrderId
  GET_ACCOUNTING_DETAILS: BASE_URL + "/purchase-orders/accounting", // append /:purchaseOrderId
  GET_VENDOR_ACCOUNTING: BASE_URL + "/purchase-orders/vendor-accounting", // append /:vendorId
  UPDATE_DUE_DATE: BASE_URL + "/purchase-orders/due-date", // append /:purchaseOrderId
};



export const creditmemos = {
  CREATE_CREDIT_MEMO: BASE_URL + "/credit-memo/create",
  GET_CREDIT_MEMO_BY_ID: BASE_URL + "/credit-memo/by-order",
  UPDATE_CREDIT_MEMO_BY_ID: BASE_URL + "/credit-memo/update",
  PROCESS_CREDIT_MEMO: BASE_URL + "/credit-memo/process", // append /:id
  APPLY_STORE_CREDIT: BASE_URL + "/credit-memo/apply-credit",
  GET_STORE_CREDIT_INFO: BASE_URL + "/credit-memo/store-credit", // append /:storeId
}

// Financial Adjustments
export const adjustment = {
  CREATE_ADJUSTMENT: BASE_URL + "/adjustments/create",
  GET_ALL_ADJUSTMENTS: BASE_URL + "/adjustments/getAll",
  GET_ADJUSTMENT: BASE_URL + "/adjustments/get", // append /:id
  GET_STORE_ADJUSTMENTS: BASE_URL + "/adjustments/store", // append /:storeId
  APPROVE_ADJUSTMENT: BASE_URL + "/adjustments", // append /:id/approve
  REJECT_ADJUSTMENT: BASE_URL + "/adjustments", // append /:id/reject
  VOID_ADJUSTMENT: BASE_URL + "/adjustments", // append /:id/void
  GET_ADJUSTMENT_SUMMARY: BASE_URL + "/adjustments/summary",
}

// Office Expenses
export const expense = {
  CREATE_EXPENSE: BASE_URL + "/expenses/create",
  GET_ALL_EXPENSES: BASE_URL + "/expenses/getAll",
  GET_EXPENSE: BASE_URL + "/expenses/get", // append /:id
  UPDATE_EXPENSE: BASE_URL + "/expenses/update", // append /:id
  DELETE_EXPENSE: BASE_URL + "/expenses/delete", // append /:id
  GET_EXPENSE_SUMMARY: BASE_URL + "/expenses/summary",
}

export const driver = {
  CREATE_DRIVER: BASE_URL + "/drivers/create",
  UPDATE_DRIVER: BASE_URL + "/drivers/update",
  GET_ALL_DRIVER: BASE_URL + "/drivers/getAll",
}
export const trip = {
  CREATE_TRIP: BASE_URL + "/trips/create",
  UPDATE_TRIP: BASE_URL + "/trips/update",
  GET_ALL_TRIP: BASE_URL + "/trips/getAll",
  GET_TRIP: BASE_URL + "/trips/get",
}

export const preOrder = {
  CREATE_PRE_ORDER: BASE_URL + "/pre-order/create",

  GET_ALL_PRE_ORDER: BASE_URL + "/pre-order/getAll",
  GET_SINGLE_PRE_ORDER: BASE_URL + "/pre-order/get",
  UPDATE_PRE_ORDER: BASE_URL + "/pre-order/update",
  CONFIRM_PRE_ORDER: BASE_URL + "/pre-order/confirm-order",
}

// Store Inventory Management
export const storeInventory = {
  GET_STORE_INVENTORY: BASE_URL + "/store-inventory/store", // append /:storeId
  GET_INVENTORY_BY_STORE: BASE_URL + "/store-inventory/summary/by-store",
  GET_INVENTORY_BY_REGION: BASE_URL + "/store-inventory/summary/by-region",
  GET_STORES_WITH_INVENTORY: BASE_URL + "/store-inventory/stores",
  TRANSFER_INVENTORY: BASE_URL + "/store-inventory/transfer",
  ADJUST_INVENTORY: BASE_URL + "/store-inventory/adjust",
  INITIALIZE_STORE_INVENTORY: BASE_URL + "/store-inventory/initialize", // append /:storeId
}

// Vendor Management - Enhanced
export const vendorEnhanced = {
  UPDATE_PAYMENT_TERMS: BASE_URL + "/vendors", // append /:id/payment-terms
  UPDATE_STATUS: BASE_URL + "/vendors", // append /:id/status
  GET_PERFORMANCE: BASE_URL + "/vendors", // append /:id/performance
  GET_UNAPPLIED_CREDITS: BASE_URL + "/vendors", // append /:id/unapplied-credits
}

// Vendor Invoices
export const vendorInvoice = {
  CREATE_INVOICE: BASE_URL + "/invoices/create",
  GET_ALL_INVOICES: BASE_URL + "/invoices/getAll",
  GET_INVOICE: BASE_URL + "/invoices/get", // append /:id
  UPDATE_INVOICE: BASE_URL + "/invoices/update", // append /:id
  DELETE_INVOICE: BASE_URL + "/invoices/delete", // append /:id
  APPROVE_INVOICE: BASE_URL + "/invoices", // append /:id/approve
  DISPUTE_INVOICE: BASE_URL + "/invoices", // append /:id/dispute
  MATCH_INVOICE: BASE_URL + "/invoices", // append /:id/match
  GET_MATCHING_COMPARISON: BASE_URL + "/invoices", // append /:id/matching-comparison
  GET_VENDOR_SUMMARY: BASE_URL + "/invoices/vendor", // append /:vendorId/summary
}

// Vendor Credit Memos
export const vendorCreditMemo = {
  CREATE_CREDIT_MEMO: BASE_URL + "/vendor-credit-memos/create",
  GET_ALL_CREDIT_MEMOS: BASE_URL + "/vendor-credit-memos/getAll",
  GET_CREDIT_MEMO: BASE_URL + "/vendor-credit-memos/get", // append /:id
  UPDATE_CREDIT_MEMO: BASE_URL + "/vendor-credit-memos/update", // append /:id
  DELETE_CREDIT_MEMO: BASE_URL + "/vendor-credit-memos/delete", // append /:id
  SUBMIT_FOR_APPROVAL: BASE_URL + "/vendor-credit-memos", // append /:id/submit
  APPROVE_CREDIT_MEMO: BASE_URL + "/vendor-credit-memos", // append /:id/approve
  APPLY_CREDIT_MEMO: BASE_URL + "/vendor-credit-memos", // append /:id/apply
  VOID_CREDIT_MEMO: BASE_URL + "/vendor-credit-memos", // append /:id/void
  GET_VENDOR_SUMMARY: BASE_URL + "/vendor-credit-memos/vendor", // append /:vendorId/summary
}

// Vendor Payments
export const vendorPayment = {
  CREATE_PAYMENT: BASE_URL + "/vendor-payments/create",
  GET_ALL_PAYMENTS: BASE_URL + "/vendor-payments/getAll",
  GET_PAYMENT: BASE_URL + "/vendor-payments/get", // append /:id
  UPDATE_PAYMENT: BASE_URL + "/vendor-payments/update", // append /:id
  UPDATE_CHECK_STATUS: BASE_URL + "/vendor-payments", // append /:id/check-status
  VOID_PAYMENT: BASE_URL + "/vendor-payments", // append /:id/void
  GET_VENDOR_SUMMARY: BASE_URL + "/vendor-payments/vendor", // append /:vendorId/summary
  CALCULATE_DISCOUNT: BASE_URL + "/vendor-payments/calculate-discount",
}

// Vendor Disputes
export const vendorDispute = {
  CREATE_DISPUTE: BASE_URL + "/vendor-disputes/create",
  GET_ALL_DISPUTES: BASE_URL + "/vendor-disputes/getAll",
  GET_DISPUTE: BASE_URL + "/vendor-disputes/get", // append /:id
  UPDATE_STATUS: BASE_URL + "/vendor-disputes", // append /:id/status
  ADD_COMMUNICATION: BASE_URL + "/vendor-disputes", // append /:id/communication
  RESOLVE_DISPUTE: BASE_URL + "/vendor-disputes", // append /:id/resolve
  ESCALATE_DISPUTE: BASE_URL + "/vendor-disputes", // append /:id/escalate
  GET_VENDOR_SUMMARY: BASE_URL + "/vendor-disputes/vendor", // append /:vendorId/summary
}

// Vendor Reports
export const vendorReports = {
  GET_DASHBOARD: BASE_URL + "/vendor-reports/dashboard",
  GET_AGING_REPORT: BASE_URL + "/vendor-reports/aging",
  GET_VENDOR_STATEMENT: BASE_URL + "/vendor-reports/vendor", // append /:id/statement
  GET_VENDOR_PERFORMANCE: BASE_URL + "/vendor-reports/vendor", // append /:id/performance
  GET_VENDOR_COMPARISON: BASE_URL + "/vendor-reports/vendor-comparison",
}

// Notifications
export const notifications = {
  GET_NOTIFICATIONS: BASE_URL + "/notifications",
  GET_UNREAD_COUNT: BASE_URL + "/notifications/unread-count",
  MARK_AS_READ: BASE_URL + "/notifications", // append /:id/read
  MARK_ALL_AS_READ: BASE_URL + "/notifications/read-all",
  DELETE_NOTIFICATION: BASE_URL + "/notifications", // append /:id
}

// Store Approval (Admin)
export const storeApproval = {
  GET_PENDING_STORES: BASE_URL + "/auth/pending-stores",
  APPROVE_STORE: BASE_URL + "/auth/approve", // append /:id
  REJECT_STORE: BASE_URL + "/auth/reject", // append /:id
}

// Legal Documents
export const legalDocuments = {
  GET_STORE_DOCUMENTS: BASE_URL + "/legal/store", // append /:storeId
  GET_DOCUMENT_CHECKLIST: BASE_URL + "/legal/store", // append /:storeId/checklist
  ADD_DOCUMENT: BASE_URL + "/legal/store", // append /:storeId/document
  UPDATE_DOCUMENT_STATUS: BASE_URL + "/legal/store", // append /:storeId/document/:documentId/status
  DELETE_DOCUMENT: BASE_URL + "/legal/store", // append /:storeId/document/:documentId
  UPDATE_BUSINESS_INFO: BASE_URL + "/legal/store", // append /:storeId/business-info
  SET_CREDIT_TERMS: BASE_URL + "/legal/store", // append /:storeId/credit-terms
  SUSPEND_CREDIT: BASE_URL + "/legal/store", // append /:storeId/suspend-credit
  GET_LEGAL_SUMMARY: BASE_URL + "/legal/store", // append /:storeId/legal-summary
}