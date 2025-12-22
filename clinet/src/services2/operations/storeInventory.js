import { apiConnector } from "../apiConnector";
import { storeInventory } from "../apis";

const {
  GET_STORE_INVENTORY,
  GET_INVENTORY_BY_STORE,
  GET_INVENTORY_BY_REGION,
  GET_STORES_WITH_INVENTORY,
  TRANSFER_INVENTORY,
  ADJUST_INVENTORY,
  INITIALIZE_STORE_INVENTORY,
} = storeInventory;

/**
 * Get inventory for a specific store
 */
export const getStoreInventoryAPI = async (storeId, params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${GET_STORE_INVENTORY}/${storeId}${queryString ? `?${queryString}` : ""}`;
    const response = await apiConnector("GET", url);
    return response?.data;
  } catch (error) {
    console.error("Error fetching store inventory:", error);
    throw error;
  }
};

/**
 * Get inventory summary grouped by store
 */
export const getInventoryByStoreAPI = async () => {
  try {
    const response = await apiConnector("GET", GET_INVENTORY_BY_STORE);
    return response?.data;
  } catch (error) {
    console.error("Error fetching inventory by store:", error);
    throw error;
  }
};

/**
 * Get inventory grouped by region/state
 */
export const getInventoryByRegionAPI = async () => {
  try {
    const response = await apiConnector("GET", GET_INVENTORY_BY_REGION);
    return response?.data;
  } catch (error) {
    console.error("Error fetching inventory by region:", error);
    throw error;
  }
};

/**
 * Get all stores with their inventory stats
 */
export const getStoresWithInventoryAPI = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${GET_STORES_WITH_INVENTORY}${queryString ? `?${queryString}` : ""}`;
    const response = await apiConnector("GET", url);
    return response?.data;
  } catch (error) {
    console.error("Error fetching stores with inventory:", error);
    throw error;
  }
};

/**
 * Transfer inventory between stores
 */
export const transferInventoryAPI = async (data) => {
  try {
    const response = await apiConnector("POST", TRANSFER_INVENTORY, data);
    return response?.data;
  } catch (error) {
    console.error("Error transferring inventory:", error);
    throw error;
  }
};

/**
 * Adjust store inventory (add/remove)
 */
export const adjustStoreInventoryAPI = async (data) => {
  try {
    const response = await apiConnector("POST", ADJUST_INVENTORY, data);
    return response?.data;
  } catch (error) {
    console.error("Error adjusting inventory:", error);
    throw error;
  }
};

/**
 * Initialize inventory for a store
 */
export const initializeStoreInventoryAPI = async (storeId) => {
  try {
    const response = await apiConnector("POST", `${INITIALIZE_STORE_INVENTORY}/${storeId}`);
    return response?.data;
  } catch (error) {
    console.error("Error initializing store inventory:", error);
    throw error;
  }
};
