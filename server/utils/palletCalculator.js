/**
 * Pallet Calculator Utility
 * 
 * Calculates pallet capacity and requirements based on case dimensions.
 * 
 * IMPORTANT DISCLAIMER:
 * All calculations are ESTIMATES for planning purposes only.
 * Actual pallet configurations depend on real-world factors like:
 * - Case shape and stacking stability
 * - Warehouse conditions
 * - Shipping requirements
 * - Product fragility
 * 
 * Always verify pallet configurations for actual shipping.
 */

// Standard North American pallet dimensions
const STANDARD_PALLET = {
    length: 48,      // inches
    width: 40,       // inches
    maxHeight: 48,   // inches (typical max stack height)
    maxWeight: 2500  // lbs (typical weight limit)
};

/**
 * Calculate how many cases fit on a single pallet
 * @param {Object} caseDimensions - {length, width, height} in inches
 * @param {Number} caseWeight - weight per case in lbs (optional)
 * @returns {Object|null} - pallet capacity estimates or null if invalid dimensions
 */
const calculatePalletCapacity = (caseDimensions, caseWeight = 0) => {
    const { length, width, height } = caseDimensions || {};

    // Validate dimensions - all must be positive numbers
    if (!length || !width || !height || 
        length <= 0 || width <= 0 || height <= 0 ||
        isNaN(length) || isNaN(width) || isNaN(height)) {
        return null;
    }

    // Calculate cases per layer - try both orientations for optimal fit
    // Orientation 1: case length along pallet length
    const orientation1 = Math.floor(STANDARD_PALLET.length / length) * 
                         Math.floor(STANDARD_PALLET.width / width);
    
    // Orientation 2: case width along pallet length (rotated 90°)
    const orientation2 = Math.floor(STANDARD_PALLET.length / width) * 
                         Math.floor(STANDARD_PALLET.width / length);

    // Use the orientation that fits more cases
    const casesPerLayer = Math.max(orientation1, orientation2);

    // If no cases fit on a layer, dimensions are too large
    if (casesPerLayer === 0) {
        return {
            casesPerLayer: 0,
            layersPerPallet: 0,
            totalCasesPerPallet: 0,
            isEstimate: true,
            error: "Case dimensions exceed pallet size"
        };
    }

    // Calculate layers based on height constraint
    const layersByHeight = Math.floor(STANDARD_PALLET.maxHeight / height);

    // Calculate layers based on weight constraint (if weight provided)
    let layersByWeight = layersByHeight;
    if (caseWeight > 0 && !isNaN(caseWeight)) {
        const maxCasesByWeight = Math.floor(STANDARD_PALLET.maxWeight / caseWeight);
        layersByWeight = Math.floor(maxCasesByWeight / casesPerLayer);
    }

    // Use the more restrictive limit
    const layersPerPallet = Math.min(layersByHeight, layersByWeight);
    const totalCasesPerPallet = casesPerLayer * layersPerPallet;

    // Determine what's limiting the capacity
    let limitedBy = 'height';
    if (caseWeight > 0 && layersByWeight < layersByHeight) {
        limitedBy = 'weight';
    }

    return {
        casesPerLayer,
        layersPerPallet,
        totalCasesPerPallet,
        isEstimate: true,
        limitedBy,
        palletDimensions: STANDARD_PALLET,
        usedOrientation: orientation1 >= orientation2 ? 'standard' : 'rotated'
    };
};

/**
 * Calculate how many pallets are needed for a given quantity
 * @param {Number} quantity - number of cases to ship
 * @param {Number} casesPerPallet - cases that fit on one pallet
 * @returns {Object|null} - pallet count and utilization info
 */
const calculatePalletsNeeded = (quantity, casesPerPallet) => {
    // Validate inputs
    if (!quantity || quantity <= 0 || !casesPerPallet || casesPerPallet <= 0) {
        return null;
    }

    const fullPallets = Math.floor(quantity / casesPerPallet);
    const remainder = quantity % casesPerPallet;
    const totalPallets = remainder > 0 ? fullPallets + 1 : fullPallets;

    // Calculate utilization percentage
    const totalCapacity = totalPallets * casesPerPallet;
    const utilizationPercent = ((quantity / totalCapacity) * 100).toFixed(1);

    return {
        fullPallets,
        partialPalletCases: remainder,
        totalPallets,
        utilizationPercent: parseFloat(utilizationPercent),
        isEstimate: true
    };
};

/**
 * Calculate pallet estimate for current inventory
 * @param {Number} currentStock - current stock in cases
 * @param {Object} palletCapacity - {totalCasesPerPallet} from calculatePalletCapacity
 * @returns {Object|null} - inventory pallet estimate
 */
const calculateInventoryPallets = (currentStock, palletCapacity) => {
    if (!currentStock || currentStock <= 0) {
        return {
            estimatedPallets: 0,
            isEstimate: true
        };
    }

    if (!palletCapacity || !palletCapacity.totalCasesPerPallet || 
        palletCapacity.totalCasesPerPallet <= 0) {
        return null;
    }

    const result = calculatePalletsNeeded(currentStock, palletCapacity.totalCasesPerPallet);
    
    if (!result) return null;

    return {
        estimatedPallets: result.totalPallets,
        fullPallets: result.fullPallets,
        partialPalletCases: result.partialPalletCases,
        utilizationPercent: result.utilizationPercent,
        isEstimate: true
    };
};

/**
 * Get a formatted display string for pallet estimate
 * @param {Object} palletInfo - result from calculatePalletsNeeded or calculateInventoryPallets
 * @returns {String} - formatted display string
 */
const formatPalletEstimate = (palletInfo) => {
    if (!palletInfo) {
        return "Dimensions required for pallet calculation";
    }

    const { totalPallets, estimatedPallets, fullPallets, partialPalletCases } = palletInfo;
    const pallets = totalPallets || estimatedPallets || 0;

    if (pallets === 0) {
        return "0 pallets";
    }

    let display = `~${pallets} pallet${pallets !== 1 ? 's' : ''}`;
    
    if (partialPalletCases > 0) {
        display += ` (${fullPallets} full + ${partialPalletCases} cases)`;
    }

    return display + " (estimate)";
};

module.exports = {
    STANDARD_PALLET,
    calculatePalletCapacity,
    calculatePalletsNeeded,
    calculateInventoryPallets,
    formatPalletEstimate
};
