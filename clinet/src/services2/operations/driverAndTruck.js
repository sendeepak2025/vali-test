import { apiConnector } from "../apiConnector";
import { driver } from "../apis";
import { toast } from "react-toastify";
import { setLoading } from "../../redux/authSlice";

const { CREATE_DRIVER, UPDATE_DRIVER, GET_ALL_DRIVER } = driver;



export const addDriverAPI = async (formData, token) => {
  const toastId = toast.loading("Adding driver...");
  try {
    const response = await apiConnector("POST", CREATE_DRIVER, formData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to create driver!");
    }

    toast.success("Driver created successfully!");
    return response.data;
  } catch (error) {
    console.error("CREATE DRIVER ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to create driver!");
    return { success: false };
  } finally {
    toast.dismiss(toastId);
  }
};


export const updateDriverAPI = (id, formData, token) => {
  return async () => {
    const toastId = toast.loading("Updating driver...");
    try {
      const response = await apiConnector(
        "PUT",
        `${UPDATE_DRIVER}/${id}`,
        formData,
        {
          Authorization: `Bearer ${token}`,
        }
      );

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Failed to update driver!");
      }

      toast.success("Driver updated successfully!");
      return response.data;
    } catch (error) {
      console.error("UPDATE DRIVER ERROR:", error);
      toast.error(error?.response?.data?.message || "Failed to update driver!");
      return { success: false };
    } finally {
      toast.dismiss(toastId);
    }
  };
};

export const getAllDriversAPI = async (token) => {
  const toastId = toast.loading("Fetching drivers...");
  try {
    const response = await apiConnector("GET", GET_ALL_DRIVER, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch drivers!");
    }

    return response.data.data || [];
  } catch (error) {
    console.error("GET ALL DRIVERS ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch drivers!");
    return [];
  } finally {
    toast.dismiss(toastId);
  }
};