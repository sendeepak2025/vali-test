import { apiConnector } from "../apiConnector";
import { trip } from "../apis";
import { toast } from "react-toastify";

const { CREATE_TRIP, UPDATE_TRIP, GET_ALL_TRIP,GET_TRIP } = trip;

export const addTripAPI = async (formData, token) => {
  const toastId = toast.loading("Adding Trip...");
  try {
    const response = await apiConnector("POST", CREATE_TRIP, formData, {
      Authorization: `Bearer ${token}`,
    });

    toast.success(response?.data?.message || "Trip created successfully!");
    return response.data;
  } catch (error) {
    console.error("CREATE TRIP ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to create trip!");
    return { success: false };
  } finally {
    toast.dismiss(toastId);
  }
};

export const updateTripAPI = (id, formData, token) => {
  return async () => {
    const toastId = toast.loading("Updating Trip...");
    try {
      const response = await apiConnector(
        "PUT",
        `${UPDATE_TRIP}/${id}`,
        formData,
        {
          Authorization: `Bearer ${token}`,
        }
      );

      toast.success(response?.data?.message || "Trip updated successfully!");
      return response.data;
    } catch (error) {
      console.error("UPDATE TRIP ERROR:", error);
      toast.error(error?.response?.data?.message || "Failed to update trip!");
      return { success: false };
    } finally {
      toast.dismiss(toastId);
    }
  };
};


export const getAllTripsAPI = async (token) => {
  const toastId = toast.loading("Fetching trips...");
  try {
    const response = await apiConnector("GET", GET_ALL_TRIP, null, {
      Authorization: `Bearer ${token}`,
    });

    return response.data || [];
  } catch (error) {
    console.error("GET ALL TRIPS ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch trips!");
    return [];
  } finally {
    toast.dismiss(toastId);
  }
};
export const getTripApi = async (token,  id) => {
  const toastId = toast.loading("Fetching trip...");
  try {
    const response = await apiConnector("GET", `${GET_TRIP}/${id}`, null, {
      Authorization: `Bearer ${token}`,
    });

    return response.data || [];
  } catch (error) {
    console.error("GET single TRIP ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch trip!");
    return [];
  } finally {
    toast.dismiss(toastId);
  }
};
