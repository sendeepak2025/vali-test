import { apiConnector } from "../apiConnector";
import { expense } from "../apis";
import { toast } from "react-toastify";

const {
  CREATE_EXPENSE,
  GET_ALL_EXPENSES,
  GET_EXPENSE,
  UPDATE_EXPENSE,
  DELETE_EXPENSE,
  GET_EXPENSE_SUMMARY,
} = expense;

// Create a new expense
export const createExpenseAPI = async (data, token) => {
  const toastId = toast.loading("Creating expense...");
  try {
    const response = await apiConnector("POST", CREATE_EXPENSE, data, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to create expense");
    }

    toast.success("Expense created successfully!");
    return response.data;
  } catch (error) {
    console.error("CREATE_EXPENSE API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to create expense");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Get all expenses with filters
export const getAllExpensesAPI = async (params, token) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${GET_ALL_EXPENSES}?${queryString}`;
    
    const response = await apiConnector("GET", url, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch expenses");
    }

    return response.data;
  } catch (error) {
    console.error("GET_ALL_EXPENSES API ERROR:", error);
    return null;
  }
};

// Get expense by ID
export const getExpenseByIdAPI = async (id, token) => {
  try {
    const response = await apiConnector("GET", `${GET_EXPENSE}/${id}`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch expense");
    }

    return response.data;
  } catch (error) {
    console.error("GET_EXPENSE API ERROR:", error);
    return null;
  }
};

// Update expense
export const updateExpenseAPI = async (id, data, token) => {
  const toastId = toast.loading("Updating expense...");
  try {
    const response = await apiConnector("PUT", `${UPDATE_EXPENSE}/${id}`, data, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to update expense");
    }

    toast.success("Expense updated successfully!");
    return response.data;
  } catch (error) {
    console.error("UPDATE_EXPENSE API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to update expense");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Delete expense
export const deleteExpenseAPI = async (id, token) => {
  const toastId = toast.loading("Deleting expense...");
  try {
    const response = await apiConnector("DELETE", `${DELETE_EXPENSE}/${id}`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to delete expense");
    }

    toast.success("Expense deleted successfully!");
    return response.data;
  } catch (error) {
    console.error("DELETE_EXPENSE API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to delete expense");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Get expense summary/statistics
export const getExpenseSummaryAPI = async (params, token) => {
  try {
    const queryString = params ? new URLSearchParams(params).toString() : "";
    const url = queryString ? `${GET_EXPENSE_SUMMARY}?${queryString}` : GET_EXPENSE_SUMMARY;
    
    const response = await apiConnector("GET", url, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch expense summary");
    }

    return response.data;
  } catch (error) {
    console.error("GET_EXPENSE_SUMMARY API ERROR:", error);
    return null;
  }
};
