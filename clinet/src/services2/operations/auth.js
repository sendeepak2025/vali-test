import { toast } from "react-toastify";
import { setUser, setToken } from "../../redux/authSlice";
import { apiConnector } from "../apiConnector";
import { endpoints, storeApproval } from "../apis";
import Swal from "sweetalert2";
const {
  LOGIN_API,
  VERIFY_LOGIN_OTP_API,
  RESEND_LOGIN_OTP_API,
  SIGNUP_API,
  CREATE_MEMBER_API,
  GET_ALL_MEMBER_API,
  UPDATE_MEMBER_PERMISSION_API,
  UPDATE_STORE,
  GET_ALL_STORES_API,
  GET_USER_API,
  FETCH_MY_PROFILE_API,
  UPDATE_PASSWORD_API,
  USER_WITH_ORDER,
  DELETE_STORE_API,
  VENDOR_WITH_ORDER,
  ADD_CHEQUES_API,
  EDIT_CHEQUE_API,
  GET_CHEQUE_API,
  DELETE_CHEQUE_API,
  UPDATE_CHEQUE_STATUS_API,
  GET_ALL_CHEQUES_API,
  GET_STORE_ANALYTICS_API,
  GET_ALL_STORES_ANALYTICS_API
} = endpoints;

export async function login(email, password, navigate, dispatch) {
  Swal.fire({
    title: "Loading",
    allowOutsideClick: false,
    allowEscapeKey: false,
    allowEnterKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  try {
    const response = await apiConnector("POST", LOGIN_API, {
      email,
      password,
    });
    Swal.close();
    
    if (!response?.data?.success) {
      await Swal.fire({
        title: "Login Failed",
        text: response.data.message,
        icon: "error",
      });
      throw new Error(response.data.message);
    }

    // Check if OTP is required
    if (response?.data?.requireOtp) {
      return {
        requireOtp: true,
        email: response.data.email,
        message: response.data.message,
      };
    }

    Swal.fire({
      title: `Login Successfully!`,
      text: `Have a nice day!`,
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#3B82F6",
      allowOutsideClick: true,
    });
    dispatch(setToken(response?.data?.token));
    dispatch(setUser(response.data.user));
    return { success: true };
  } catch (error) {
    console.log("LOGIN API ERROR............", error);
    Swal.fire({
      title: "Login Failed",
      text:
        error.response?.data?.message ||
        "Something went wrong, please try again later",
      icon: "error",
    });
    return { success: false };
  }
}

export async function verifyLoginOtp(email, otp, navigate, dispatch) {
  Swal.fire({
    title: "Verifying OTP",
    allowOutsideClick: false,
    allowEscapeKey: false,
    allowEnterKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  try {
    const response = await apiConnector("POST", VERIFY_LOGIN_OTP_API, {
      email,
      otp,
    });
    Swal.close();
    
    if (!response?.data?.success) {
      await Swal.fire({
        title: "Verification Failed",
        text: response.data.message,
        icon: "error",
      });
      throw new Error(response.data.message);
    }

    Swal.fire({
      title: `Login Successfully!`,
      text: `Have a nice day!`,
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#3B82F6",
      allowOutsideClick: true,
    });
    dispatch(setToken(response?.data?.token));
    dispatch(setUser(response.data.user));
    return { success: true };
  } catch (error) {
    console.log("VERIFY OTP API ERROR............", error);
    Swal.fire({
      title: "Verification Failed",
      text:
        error.response?.data?.message ||
        "Invalid or expired OTP. Please try again.",
      icon: "error",
    });
    return { success: false };
  }
}

export async function resendLoginOtp(email) {
  const toastId = toast.loading("Resending OTP...");
  
  try {
    const response = await apiConnector("POST", RESEND_LOGIN_OTP_API, {
      email,
    });
    
    if (!response?.data?.success) {
      throw new Error(response.data.message);
    }

    toast.success("OTP resent to your email!");
    return { success: true };
  } catch (error) {
    console.log("RESEND OTP API ERROR............", error);
    toast.error(
      error.response?.data?.message ||
      "Failed to resend OTP. Please try again."
    );
    return { success: false };
  } finally {
    toast.dismiss(toastId);
  }
}

// Send OTP for store order (email verification)
export async function sendStoreOrderOtp(email) {
  const toastId = toast.loading("Sending OTP...");
  
  try {
    const response = await apiConnector("POST", endpoints.SEND_STORE_ORDER_OTP_API, {
      email,
    });
    
    if (!response?.data?.success) {
      throw new Error(response.data.message);
    }

    toast.success("OTP sent to your email!");
    return { success: true, email: response.data.email };
  } catch (error) {
    console.log("SEND STORE ORDER OTP API ERROR............", error);
    toast.error(
      error.response?.data?.message ||
      "Store not found or failed to send OTP."
    );
    return { success: false };
  } finally {
    toast.dismiss(toastId);
  }
}

// Verify OTP for store order and get store info
export async function verifyStoreOrderOtp(email, otp) {
  const toastId = toast.loading("Verifying OTP...");
  
  try {
    const response = await apiConnector("POST", endpoints.VERIFY_STORE_ORDER_OTP_API, {
      email,
      otp,
    });
    
    if (!response?.data?.success) {
      throw new Error(response.data.message);
    }

    toast.success("Verified successfully!");
    return { success: true, user: response.data.user };
  } catch (error) {
    console.log("VERIFY STORE ORDER OTP API ERROR............", error);
    toast.error(
      error.response?.data?.message ||
      "Invalid or expired OTP."
    );
    return { success: false };
  } finally {
    toast.dismiss(toastId);
  }
}

export async function signUp(formData, navigate, dispatch) {
  Swal.fire({
    title: "Loading",
    allowOutsideClick: false,
    allowEscapeKey: false,
    allowEnterKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  try {
    const response = await apiConnector("POST", SIGNUP_API, formData);

    console.log("SIGNUP API RESPONSE............", response);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    // Check if this is a store registration (pending approval)
    const isStoreRegistration = formData.role === "store";
    const registrationRef = response?.data?.user?.registrationRef;

    if (isStoreRegistration && registrationRef) {
      // Show pending approval message for store registrations
      await Swal.fire({
        title: "Registration Submitted!",
        html: `
          <div style="text-align: left; padding: 10px;">
            <p style="margin-bottom: 15px;">Your store registration has been submitted for review.</p>
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
              <p style="font-size: 12px; color: #666; margin-bottom: 5px;">Your Registration Reference</p>
              <p style="font-size: 18px; font-weight: bold; color: #0369a1; font-family: monospace;">${registrationRef}</p>
            </div>
            <p style="font-size: 14px; color: #666;">Please save this reference number. You will receive an email notification once your registration is approved.</p>
          </div>
        `,
        icon: "success",
        confirmButtonText: "Got it!",
        confirmButtonColor: "#3B82F6",
        allowOutsideClick: false,
      });
      
      // Navigate to login page after store registration
      navigate("/auth");
    } else {
      Swal.fire({
        title: `User Register Successful!`,
        text: `Have a nice day!`,
        icon: "success",
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
        allowOutsideClick: true,
      });
    }

    return response?.data?.success;
  } catch (error) {
    console.log("SIGNUP API ERROR............", error);

    // toast.error(error.response?.data?.message)
    Swal.fire({
      title: "Error",
      text: error.response?.data?.message || "Something went wrong. Please try again later.",
      icon: "error",
      confirmButtonText: "OK",
    });
  }

  // Close the loading alert after completion
  // Swal.close();
}
export async function createMemberAPI(formData) {
  Swal.fire({
    title: "Loading",
    allowOutsideClick: false,
    allowEscapeKey: false,
    allowEnterKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  try {
    const response = await apiConnector("POST", CREATE_MEMBER_API, formData);

    console.log("SIGNUP API RESPONSE............", response);

    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    Swal.fire({
      title: `Member Created Successfully!`,
      text: `Have a nice day!`,
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#3B82F6",
      allowOutsideClick: true,
    });


  } catch (error) {
    console.log("SIGNUP API ERROR............", error);

    Swal.fire({
      title: "Error",
      text: error.response?.data?.message || "Something went wrong. Please try again later.",
      icon: "error",
      confirmButtonText: "OK",
    });
  }

  // Close the loading alert after completion
  // Swal.close();
}



export const getAllMembersAPI = async () => {

  try {
    const response = await apiConnector("GET", GET_ALL_MEMBER_API,)


    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.members || [];
  } catch (error) {
    console.error("GET Product API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get product!");
    return [];
  }

};

export const userWithOrderDetails = async (id) => {

  try {
    const response = await apiConnector("GET", `${USER_WITH_ORDER}/${id}`,)


    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data || {};
  } catch (error) {
    console.error("GET User with order API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed User with order product!");
    return [];
  }

};



export const vendorWithOrderDetails = async (id) => {

  try {
    const response = await apiConnector("GET", `${VENDOR_WITH_ORDER}/${id}`,)


    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data || {};
  } catch (error) {
    console.error("GET User with order API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed User with order product!");
    return [];
  }

};

export const getUserAPI = async ({
  email = null,
  id = null,
  phone = null,
  setIsGroupOpen = () => {},
}) => {
  try {
    const response = await apiConnector("POST", GET_USER_API, { email, id, phone });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.user;
  } catch (error) {
    if (typeof setIsGroupOpen === "function") {
      setIsGroupOpen(true);
    }

    console.error("GET USER API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get user!");
    return null;
  }
};


export const getAllStoresAPI = async () => {

  try {
    const response = await apiConnector("GET", GET_ALL_STORES_API,)


    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.stores || [];
  } catch (error) {
    console.error("GET Stores API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get Stores!");
    return [];
  }

};

export function logout(navigate) {
  return (dispatch) => {
    dispatch(setToken(null));
    dispatch(setUser(null));

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    Swal.fire({
      title: `User Logout Successful!`,
      text: `Have a nice day!`,
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#3B82F6",
      allowOutsideClick: true,
    });
    navigate("/");
  };
}


export const updatePassword = async (email, newPassword) => {
  Swal.fire({
    title: "Loading",
    allowOutsideClick: false,
    allowEscapeKey: false,
    allowEnterKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  try {
    const response = await apiConnector("PUT", `${UPDATE_PASSWORD_API}`, { email, newPassword })
    if (!response.data.success) {
      throw new Error(response.data.message);
    }

    Swal.fire({
      title: `Password Update Successful!`,
      text: `Have a nice day!`,
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#3B82F6",
      allowOutsideClick: true,
    });

  } catch (error) {
    console.error("Error updating password", error);
    throw new Error("There was an error updating the password. Please try again.");
  }
};


export const updateMemberAPI = async (id, formData) => {

  try {
    const response = await apiConnector("PUT", `${UPDATE_MEMBER_PERMISSION_API}/${id}`, formData);


    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success("Member Permission update!");
    return response?.data;
  } catch (error) {
    console.error("UPDATE Product API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to Update product!");
    return [];

  };
};


export const updateStoreAPI = async (id, formData, token) => {

  const toastId = toast.loading("Loading...");


  try {
    const response = await apiConnector("PUT", `${UPDATE_STORE}/${id}`, formData, {
      Authorization: `Bearer ${token}`,
    });

console.log(response)
    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }
    toast.success(response?.data?.message)
    return response?.data;
  } catch (error) {
    console.error("UPDATE store API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to Update store!");
    return [];
  } finally {

    toast.dismiss(toastId);
  }

};

export const deleteStoreAPI = async (id, token) => {
  const toastId = toast.loading("Loading...");

  try {
    const response = await apiConnector("DELETE", `${DELETE_STORE_API}/${id}`, {}, {
      Authorization: `Bearer ${token}`,
    });

    console.log(response);
    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }
    toast.success(response?.data?.message);
    return true;
  } catch (error) {
    console.error("DELETE store API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to delete store!");
    return false;
  } finally {
    toast.dismiss(toastId);
  }
};


export const updatePasswordSetting = async (formData, token) => {

  const toastId = toast.loading("Loading...");


  try {
    const response = await apiConnector("PUT", `${UPDATE_PASSWORD_API}`, formData, {
      Authorization: `Bearer ${token}`,
    });


    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }
    toast.success(response?.data?.messag)
    return response?.data;
  } catch (error) {
    console.error("UPDATE_PASSWORD_API API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to Update Password!");
    return [];
  } finally {

    toast.dismiss(toastId);
  }

};




export function fetchMyProfile(token,navigate) {

  return async (dispatch) => {
  
    try {
      const response = await apiConnector("GET", FETCH_MY_PROFILE_API, null, {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      })

      console.log("APP JS RESPONSE............", response)

      if (!response?.data?.success) {
        throw new Error(response?.data?.message)
      }
      // console.log(response.data)

      dispatch(setUser(response?.data?.user))



      localStorage.setItem("user", JSON.stringify(response?.data?.user))

    } catch (error) {
      console.log("LOGIN API ERROR............", error)

      if (error?.response?.data?.message === 'Token expired' || error?.response?.data?.message === 'token is invalid') {
        Swal.fire({
          title: "Session Expired",
          text: "Please log in again for security purposes.",
          icon: "warning",
          button: "Login",
        }).then(() => {
          dispatch(logout(navigate));
          navigate('/login'); // Redirect to login page
        });
      }
    }
    
  }
}




export const addChequesAPI = async (id, formData) => {
  try {
    const response = await apiConnector(
      "POST",
      `${ADD_CHEQUES_API}/${id}`,
      formData
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success("Cheque added successfully!");
    return response?.data;
  } catch (error) {
    console.error("ADD CHEQUES API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to add cheque!");
    return [];
  }
};


export const editChequeAPI = async (id, chequeId, formData) => {
  try {
    const response = await apiConnector("PUT", `${EDIT_CHEQUE_API}/${id}/${chequeId}`, formData);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success("Cheque updated successfully!");
    return response?.data;
  } catch (error) {
    console.error("EDIT CHEQUE API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to update cheque!");
    return [];
  }
};

export const getChequesByStoreAPI = async (id) => {
  try {
    const response = await apiConnector("GET", `${GET_CHEQUE_API}/${id}`);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.cheques || [];
  } catch (error) {
    console.error("GET CHEQUES API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch cheques!");
    return [];
  }
};


// Delete cheque
export const deleteChequeAPI = async (storeId, chequeId) => {
  try {
    const response = await apiConnector("DELETE", `${DELETE_CHEQUE_API}/${storeId}/${chequeId}`);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success("Cheque deleted successfully!");
    return response?.data;
  } catch (error) {
    console.error("DELETE CHEQUE API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to delete cheque!");
    return null;
  }
};

// Update cheque status
export const updateChequeStatusAPI = async (storeId, chequeId, statusData) => {
  try {
    const response = await apiConnector("PUT", `${UPDATE_CHEQUE_STATUS_API}/${storeId}/${chequeId}/status`, statusData);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success("Cheque status updated successfully!");
    return response?.data;
  } catch (error) {
    console.error("UPDATE CHEQUE STATUS API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to update cheque status!");
    return null;
  }
};

// Get all cheques (for reconciliation)
export const getAllChequesAPI = async (status = "") => {
  try {
    const url = status ? `${GET_ALL_CHEQUES_API}?status=${status}` : GET_ALL_CHEQUES_API;
    const response = await apiConnector("GET", url);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data;
  } catch (error) {
    console.error("GET ALL CHEQUES API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch cheques!");
    return { cheques: [], summary: {} };
  }
};

// Get store analytics for a single store
export const getStoreAnalyticsAPI = async (storeId) => {
  try {
    const response = await apiConnector("GET", `${GET_STORE_ANALYTICS_API}/${storeId}`);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.analytics;
  } catch (error) {
    console.error("GET STORE ANALYTICS API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch store analytics!");
    return null;
  }
};

// Get analytics for all stores (bulk) - optimized for admin dashboard with pagination
export const getAllStoresAnalyticsAPI = async (params = {}) => {
  try {
    const { page = 1, limit = 20, search = "", state = "", paymentStatus = "", sortBy = "storeName", sortOrder = "asc" } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search,
      state,
      paymentStatus,
      sortBy,
      sortOrder
    }).toString();
    
    const response = await apiConnector("GET", `${GET_ALL_STORES_ANALYTICS_API}?${queryParams}`);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data;
  } catch (error) {
    console.error("GET ALL STORES ANALYTICS API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch stores analytics!");
    return { stores: [], summary: {}, pagination: { page: 1, limit: 20, totalStores: 0, totalPages: 0 }, filters: { uniqueStates: [] } };
  }
};

// Get paginated overdue/warning stores for Payments tab
export const getPaginatedPaymentStoresAPI = async (params = {}) => {
  try {
    const { page = 1, limit = 10, type = "overdue" } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      type
    }).toString();
    
    const response = await apiConnector("GET", `${endpoints.GET_PAGINATED_PAYMENT_STORES_API}?${queryParams}`);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data;
  } catch (error) {
    console.error("GET PAGINATED PAYMENT STORES API ERROR:", error);
    return { stores: [], pagination: { page: 1, limit: 10, totalStores: 0, totalPages: 0 } };
  }
};

// Get paginated orders for a specific store (modal)
export const getStoreOrdersPaginatedAPI = async (storeId, params = {}) => {
  try {
    const { page = 1, limit = 10 } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    }).toString();
    
    const response = await apiConnector("GET", `${endpoints.GET_STORE_ORDERS_PAGINATED_API}/${storeId}/orders-paginated?${queryParams}`);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data;
  } catch (error) {
    console.error("GET STORE ORDERS PAGINATED API ERROR:", error);
    return { orders: [], pagination: { page: 1, limit: 10, totalOrders: 0, totalPages: 0 } };
  }
};


// ============ Store Communication & Payment APIs ============

// Add communication log (call, email, note)
export const addCommunicationLogAPI = async (storeId, logData) => {
  try {
    const response = await apiConnector("POST", `${endpoints.ADD_COMMUNICATION_LOG_API}/${storeId}/communication`, logData);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success("Communication logged successfully!");
    return response?.data;
  } catch (error) {
    console.error("ADD COMMUNICATION LOG API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to log communication!");
    return null;
  }
};

// Get communication logs for a store
export const getCommunicationLogsAPI = async (storeId) => {
  try {
    const response = await apiConnector("GET", `${endpoints.GET_COMMUNICATION_LOGS_API}/${storeId}/communications`);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.logs || [];
  } catch (error) {
    console.error("GET COMMUNICATION LOGS API ERROR:", error);
    return [];
  }
};

// Add payment record (cash/card/bank transfer)
export const addPaymentRecordAPI = async (storeId, paymentData) => {
  try {
    const response = await apiConnector("POST", `${endpoints.ADD_PAYMENT_RECORD_API}/${storeId}/payment`, paymentData);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success("Payment recorded successfully!");
    return response?.data;
  } catch (error) {
    console.error("ADD PAYMENT RECORD API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to record payment!");
    return null;
  }
};

// Get payment records for a store
export const getPaymentRecordsAPI = async (storeId) => {
  try {
    const response = await apiConnector("GET", `${endpoints.GET_PAYMENT_RECORDS_API}/${storeId}/payments`);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.payments || [];
  } catch (error) {
    console.error("GET PAYMENT RECORDS API ERROR:", error);
    return [];
  }
};

// Send payment reminder email
export const sendPaymentReminderAPI = async (storeId) => {
  const toastId = toast.loading("Sending reminder...");
  try {
    const response = await apiConnector("POST", `${endpoints.SEND_PAYMENT_REMINDER_API}/${storeId}/send-reminder`);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success("Payment reminder sent successfully!");
    return response?.data;
  } catch (error) {
    console.error("SEND PAYMENT REMINDER API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to send reminder!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Send account statement email
export const sendStatementEmailAPI = async (storeId) => {
  const toastId = toast.loading("Sending statement...");
  try {
    const response = await apiConnector("POST", `${endpoints.SEND_STATEMENT_EMAIL_API}/${storeId}/send-statement`);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success("Statement sent successfully!");
    return response?.data;
  } catch (error) {
    console.error("SEND STATEMENT EMAIL API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to send statement!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Get statement data (for PDF generation)
export const getStatementDataAPI = async (storeId) => {
  try {
    const response = await apiConnector("GET", `${endpoints.GET_STATEMENT_DATA_API}/${storeId}/statement`);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.statement;
  } catch (error) {
    console.error("GET STATEMENT DATA API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get statement data!");
    return null;
  }
};


// ============ Store Approval APIs (Admin) ============

/**
 * Get all pending store registrations
 * @param {string} token - Auth token
 */
export const getPendingStoresAPI = async (token) => {
  try {
    const response = await apiConnector(
      "GET",
      storeApproval.GET_PENDING_STORES,
      null,
      { Authorization: `Bearer ${token}` }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.stores || [];
  } catch (error) {
    console.error("GET PENDING STORES API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch pending stores!");
    return [];
  }
};

/**
 * Approve a store registration
 * @param {string} storeId - Store ID to approve
 * @param {string} priceCategory - Price category to assign (aPrice, bPrice, cPrice, restaurantPrice)
 * @param {string} token - Auth token
 */
export const approveStoreAPI = async (storeId, priceCategory, token) => {
  const toastId = toast.loading("Approving store...");
  try {
    const response = await apiConnector(
      "POST",
      `${storeApproval.APPROVE_STORE}/${storeId}`,
      { priceCategory },
      { Authorization: `Bearer ${token}` }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success("Store approved successfully!");
    return response?.data;
  } catch (error) {
    console.error("APPROVE STORE API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to approve store!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

/**
 * Reject a store registration
 * @param {string} storeId - Store ID to reject
 * @param {string} reason - Rejection reason
 * @param {string} token - Auth token
 */
export const rejectStoreAPI = async (storeId, reason, token) => {
  const toastId = toast.loading("Rejecting store...");
  try {
    const response = await apiConnector(
      "POST",
      `${storeApproval.REJECT_STORE}/${storeId}`,
      { reason },
      { Authorization: `Bearer ${token}` }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success("Store rejected");
    return response?.data;
  } catch (error) {
    console.error("REJECT STORE API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to reject store!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};
