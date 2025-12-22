/**
 * Order Validation Utility
 * 
 * Validates order items based on product's salesMode configuration.
 * Ensures orders comply with how products are configured to be sold.
 */

/**
 * Validate a single order item against product's salesMode
 * @param {Object} product - Product document with salesMode field
 * @param {Object} orderItem - Order item with {quantity, pricingType}
 * @returns {Object} - {valid: boolean, error?: string}
 */
const validateOrderItem = (product, orderItem) => {
    const { salesMode = 'both' } = product || {};
    const { quantity, pricingType } = orderItem || {};

    // Basic validation
    if (quantity === undefined || quantity === null) {
        return { valid: false, error: 'Quantity is required' };
    }

    if (quantity <= 0) {
        return { valid: false, error: 'Quantity must be greater than 0' };
    }

    if (!pricingType) {
        return { valid: false, error: 'Pricing type is required' };
    }

    // Validate based on salesMode
    switch (salesMode) {
        case 'case':
            // Case-only products: must use box pricing with integer quantities
            if (pricingType === 'unit') {
                return { 
                    valid: false, 
                    error: 'This product can only be ordered by case. Please select case/box pricing.' 
                };
            }
            if (!Number.isInteger(quantity) || quantity < 1) {
                return { 
                    valid: false, 
                    error: 'Case quantity must be a whole number (1 or more)' 
                };
            }
            break;

        case 'unit':
            // Unit-only products: must use unit pricing
            if (pricingType === 'box') {
                return { 
                    valid: false, 
                    error: 'This product can only be ordered by unit (lb, oz, pieces, etc.)' 
                };
            }
            // Decimal quantities are allowed for unit mode
            break;

        case 'both':
        default:
            // Both mode: validate based on selected pricing type
            if (pricingType === 'box') {
                // Case orders must be integers
                if (!Number.isInteger(quantity) || quantity < 1) {
                    return { 
                        valid: false, 
                        error: 'Case quantity must be a whole number (1 or more)' 
                    };
                }
            }
            // Unit orders can be decimals, just need to be positive (already checked above)
            break;
    }

    return { valid: true };
};

/**
 * Validate all items in an order
 * @param {Array} items - Array of order items with productId, quantity, pricingType
 * @param {Array} products - Array of product documents (must include salesMode)
 * @returns {Object} - {valid: boolean, errors: Array<{itemIndex, productName, error}>}
 */
const validateOrderItems = (items, products) => {
    const errors = [];
    
    if (!items || !Array.isArray(items) || items.length === 0) {
        return { valid: false, errors: [{ error: 'Order must contain at least one item' }] };
    }

    // Create a map of products by ID for quick lookup
    const productMap = new Map();
    if (products && Array.isArray(products)) {
        products.forEach(p => {
            if (p._id) {
                productMap.set(p._id.toString(), p);
            }
        });
    }

    items.forEach((item, index) => {
        const productId = item.productId?.toString();
        const product = productMap.get(productId);

        if (!product) {
            errors.push({
                itemIndex: index,
                productId: productId,
                error: 'Product not found'
            });
            return;
        }

        const validation = validateOrderItem(product, item);
        
        if (!validation.valid) {
            errors.push({
                itemIndex: index,
                productId: productId,
                productName: product.name || 'Unknown Product',
                error: validation.error
            });
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Get allowed pricing types for a product based on salesMode
 * @param {String} salesMode - Product's salesMode ('unit', 'case', 'both')
 * @returns {Object} - {allowUnit: boolean, allowCase: boolean, default: string}
 */
const getAllowedPricingTypes = (salesMode) => {
    switch (salesMode) {
        case 'case':
            return { allowUnit: false, allowCase: true, default: 'box' };
        case 'unit':
            return { allowUnit: true, allowCase: false, default: 'unit' };
        case 'both':
        default:
            return { allowUnit: true, allowCase: true, default: 'box' };
    }
};

/**
 * Get quantity input constraints based on salesMode and pricingType
 * @param {String} salesMode - Product's salesMode
 * @param {String} pricingType - Selected pricing type ('unit' or 'box')
 * @returns {Object} - {min, step, allowDecimals}
 */
const getQuantityConstraints = (salesMode, pricingType) => {
    // Case/box orders always require integers
    if (pricingType === 'box') {
        return { min: 1, step: 1, allowDecimals: false };
    }

    // Unit orders can have decimals
    if (pricingType === 'unit') {
        return { min: 0.01, step: 0.01, allowDecimals: true };
    }

    // Default
    return { min: 1, step: 1, allowDecimals: false };
};

module.exports = {
    validateOrderItem,
    validateOrderItems,
    getAllowedPricingTypes,
    getQuantityConstraints
};
