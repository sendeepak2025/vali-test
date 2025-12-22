import { apiConnector } from "../apiConnector";
import { vendorReports } from "../apis";
import { toast } from "react-toastify";

const {
  GET_DASHBOARD,
  GET_AGING_REPORT,
  GET_VENDOR_STATEMENT,
  GET_VENDOR_PERFORMANCE,
  GET_VENDOR_COMPARISON,
} = vendorReports;

// Get Dashboard Summary
export const getVendorDashboardAPI = async (token) => {
  try {
    const response = await apiConnector("GET", GET_DASHBOARD, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Dashboard API ERROR:", error);
    return null;
  }
};

// Get Aging Report
export const getAgingReportAPI = async (params, token) => {
  try {
    const response = await apiConnector("GET", GET_AGING_REPORT, null, {
      Authorization: `Bearer ${token}`,
    }, params);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Aging Report API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get aging report!");
    return null;
  }
};

// Get Vendor Statement
export const getVendorStatementAPI = async (vendorId, params, token) => {
  try {
    const response = await apiConnector("GET", `${GET_VENDOR_STATEMENT}/${vendorId}/statement`, null, {
      Authorization: `Bearer ${token}`,
    }, params);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Vendor Statement API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get vendor statement!");
    return null;
  }
};

// Get Vendor Performance Scorecard
export const getVendorPerformanceAPI = async (vendorId, params, token) => {
  try {
    const response = await apiConnector("GET", `${GET_VENDOR_PERFORMANCE}/${vendorId}/performance`, null, {
      Authorization: `Bearer ${token}`,
    }, params);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Vendor Performance API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get vendor performance!");
    return null;
  }
};

// Get Vendor Comparison Report
export const getVendorComparisonAPI = async (params, token) => {
  try {
    const response = await apiConnector("GET", GET_VENDOR_COMPARISON, null, {
      Authorization: `Bearer ${token}`,
    }, params);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Vendor Comparison API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get vendor comparison!");
    return null;
  }
};
