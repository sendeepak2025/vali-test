import { apiConnector } from "../apiConnector";
import { vendorPayment } from "../apis";
import { toast } from "react-toastify";

const {
  CREATE_PAYMENT,
  GET_ALL_PAYMENTS,
  GET_PAYMENT,
  UPDATE_CHECK_STATUS,
  VOID_PAYMENT,
  GET_VENDOR_SUMMARY,
  CALCULATE_DISCOUNT,
} = vendorPayment;

// Create Vendor Payment
export const createVendorPaymentAPI = async (formData, token) => {
  const toastId = toast.loading("Recording payment...");
  try {
    const response = await apiConnector("POST", CREATE_PAYMENT, formData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Payment recorded successfully!");
    return response?.data;
  } catch (error) {
    console.error("CREATE Payment API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to record payment!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Get All Vendor Payments
export const getAllVendorPaymentsAPI = async (params, token) => {
  try {
    const response = await apiConnector("GET", GET_ALL_PAYMENTS, null, {
      Authorization: `Bearer ${token}`,
    }, params);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET ALL Payments API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get payments!");
    return null;
  }
};

// Get Single Payment
export const getVendorPaymentAPI = async (id, token) => {
  try {
    const response = await apiConnector("GET", `${GET_PAYMENT}/${id}`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Payment API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get payment!");
    return null;
  }
};

// Update Check Status
export const updateCheckStatusAPI = async (id, data, token) => {
  const toastId = toast.loading("Updating check status...");
  try {
    const response = await apiConnector("PUT", `${UPDATE_CHECK_STATUS}/${id}/check-status`, data, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Check status updated!");
    return response?.data;
  } catch (error) {
    console.error("UPDATE Check Status API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to update check status!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Void Payment
export const voidVendorPaymentAPI = async (id, data, token) => {
  const toastId = toast.loading("Voiding payment...");
  try {
    const response = await apiConnector("PUT", `${VOID_PAYMENT}/${id}/void`, data, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Payment voided!");
    return response?.data;
  } catch (error) {
    console.error("VOID Payment API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to void payment!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Get Vendor Payment Summary
export const getVendorPaymentSummaryAPI = async (vendorId, token) => {
  try {
    const response = await apiConnector("GET", `${GET_VENDOR_SUMMARY}/${vendorId}/summary`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Vendor Payment Summary API ERROR:", error);
    return null;
  }
};

// Calculate Early Payment Discount Preview
export const calculateDiscountPreviewAPI = async (data, token) => {
  try {
    const response = await apiConnector("POST", CALCULATE_DISCOUNT, data, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("CALCULATE Discount API ERROR:", error);
    return null;
  }
};
