/**
 * Three-Way Matching Service
 * Compares Purchase Order, Receiving Report, and Invoice to identify discrepancies
 */

const PurchaseOrder = require('../models/purchaseModel');
const Invoice = require('../models/invoiceModel');

// Default tolerance percentage for price matching
const DEFAULT_PRICE_TOLERANCE = 2; // 2%
const DEFAULT_QUANTITY_TOLERANCE = 0; // Exact match for quantities

/**
 * Performs three-way matching between PO, Received quantities, and Invoice
 * @param {Object} invoice - The invoice document
 * @param {Array} purchaseOrders - Array of linked purchase order documents
 * @param {Object} options - Matching options (tolerances)
 * @returns {Object} Matching results with details
 */
const performThreeWayMatching = async (invoice, purchaseOrders, options = {}) => {
  const {
    priceTolerance = DEFAULT_PRICE_TOLERANCE,
    quantityTolerance = DEFAULT_QUANTITY_TOLERANCE,
    approvalThreshold = 5 // Percentage variance that requires approval
  } = options;

  const matchingResults = {
    poMatch: true,
    receivingMatch: true,
    priceMatch: true,
    varianceAmount: 0,
    variancePercentage: 0,
    matchedAt: new Date(),
    details: [],
    summary: {
      totalPOAmount: 0,
      totalReceivedAmount: 0,
      totalInvoiceAmount: invoice.totalAmount,
      quantityVariances: [],
      priceVariances: []
    }
  };

  // Aggregate PO data
  const poData = aggregatePOData(purchaseOrders);
  matchingResults.summary.totalPOAmount = poData.totalAmount;
  matchingResults.summary.totalReceivedAmount = poData.totalReceivedAmount;

  // 1. Compare PO quantities vs Invoice quantities
  const quantityComparison = compareQuantities(
    poData.items,
    invoice.lineItems,
    quantityTolerance
  );
  
  if (!quantityComparison.match) {
    matchingResults.poMatch = false;
    matchingResults.details.push(...quantityComparison.details);
    matchingResults.summary.quantityVariances = quantityComparison.variances;
  }

  // 2. Compare Received quantities vs Invoice quantities
  const receivingComparison = compareReceivedQuantities(
    poData.items,
    invoice.lineItems,
    quantityTolerance
  );
  
  if (!receivingComparison.match) {
    matchingResults.receivingMatch = false;
    matchingResults.details.push(...receivingComparison.details);
  }

  // 3. Compare PO prices vs Invoice prices
  const priceComparison = comparePrices(
    poData.items,
    invoice.lineItems,
    priceTolerance
  );
  
  if (!priceComparison.match) {
    matchingResults.priceMatch = false;
    matchingResults.details.push(...priceComparison.details);
    matchingResults.summary.priceVariances = priceComparison.variances;
  }

  // 4. Calculate total variance
  matchingResults.varianceAmount = invoice.totalAmount - poData.totalAmount;
  matchingResults.variancePercentage = poData.totalAmount > 0
    ? ((invoice.totalAmount - poData.totalAmount) / poData.totalAmount) * 100
    : 0;

  // 5. Determine if approval is required based on variance threshold
  const approvalRequired = Math.abs(matchingResults.variancePercentage) > approvalThreshold;

  return {
    matchingResults,
    approvalRequired,
    isFullMatch: matchingResults.poMatch && matchingResults.receivingMatch && matchingResults.priceMatch
  };
};

/**
 * Aggregates data from multiple purchase orders
 */
const aggregatePOData = (purchaseOrders) => {
  const itemsMap = new Map();
  let totalAmount = 0;
  let totalReceivedAmount = 0;

  purchaseOrders.forEach(po => {
    totalAmount += po.totalAmount || 0;

    po.items.forEach(item => {
      const key = item.productId?.toString() || item.productName;
      const existing = itemsMap.get(key);

      // Calculate received amount based on approved quantities
      const approvedQty = item.qualityStatus === 'approved' ? item.quantity : 0;
      const receivedAmount = approvedQty * (item.unitPrice || 0);
      totalReceivedAmount += receivedAmount;

      if (existing) {
        existing.orderedQuantity += item.quantity || 0;
        existing.receivedQuantity += approvedQty;
        existing.totalPrice += item.totalPrice || 0;
        existing.poNumbers.push(po.purchaseOrderNumber);
      } else {
        itemsMap.set(key, {
          productId: item.productId,
          productName: item.productName || item.productId?.name,
          orderedQuantity: item.quantity || 0,
          receivedQuantity: approvedQty,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || 0,
          unit: item.unit,
          poNumbers: [po.purchaseOrderNumber]
        });
      }
    });
  });

  return {
    items: Array.from(itemsMap.values()),
    totalAmount,
    totalReceivedAmount
  };
};

/**
 * Compares PO quantities with Invoice quantities
 */
const compareQuantities = (poItems, invoiceItems, tolerance) => {
  const details = [];
  const variances = [];
  let match = true;

  // Create a map of invoice items by product
  const invoiceMap = new Map();
  invoiceItems.forEach(item => {
    const key = item.productId?.toString() || item.description;
    invoiceMap.set(key, item);
  });

  // Compare each PO item with invoice
  poItems.forEach(poItem => {
    const key = poItem.productId?.toString() || poItem.productName;
    const invoiceItem = invoiceMap.get(key);

    if (!invoiceItem) {
      // Item in PO but not in invoice
      details.push({
        field: 'quantity',
        item: poItem.productName,
        expected: poItem.orderedQuantity,
        actual: 0,
        variance: -poItem.orderedQuantity,
        type: 'missing_in_invoice'
      });
      match = false;
      variances.push({
        productName: poItem.productName,
        poQuantity: poItem.orderedQuantity,
        invoiceQuantity: 0,
        variance: -poItem.orderedQuantity
      });
    } else {
      const variance = invoiceItem.quantity - poItem.orderedQuantity;
      const variancePercent = poItem.orderedQuantity > 0
        ? Math.abs(variance / poItem.orderedQuantity) * 100
        : (invoiceItem.quantity > 0 ? 100 : 0);

      if (variancePercent > tolerance) {
        details.push({
          field: 'quantity',
          item: poItem.productName,
          expected: poItem.orderedQuantity,
          actual: invoiceItem.quantity,
          variance: variance,
          type: 'quantity_mismatch'
        });
        match = false;
        variances.push({
          productName: poItem.productName,
          poQuantity: poItem.orderedQuantity,
          invoiceQuantity: invoiceItem.quantity,
          variance: variance
        });
      }
    }
  });

  // Check for items in invoice but not in PO
  invoiceItems.forEach(invoiceItem => {
    const key = invoiceItem.productId?.toString() || invoiceItem.description;
    const poItem = poItems.find(p => 
      (p.productId?.toString() || p.productName) === key
    );

    if (!poItem) {
      details.push({
        field: 'quantity',
        item: invoiceItem.description || invoiceItem.productName,
        expected: 0,
        actual: invoiceItem.quantity,
        variance: invoiceItem.quantity,
        type: 'extra_in_invoice'
      });
      match = false;
      variances.push({
        productName: invoiceItem.description || invoiceItem.productName,
        poQuantity: 0,
        invoiceQuantity: invoiceItem.quantity,
        variance: invoiceItem.quantity
      });
    }
  });

  return { match, details, variances };
};

/**
 * Compares Received quantities with Invoice quantities
 */
const compareReceivedQuantities = (poItems, invoiceItems, tolerance) => {
  const details = [];
  let match = true;

  // Create a map of invoice items by product
  const invoiceMap = new Map();
  invoiceItems.forEach(item => {
    const key = item.productId?.toString() || item.description;
    invoiceMap.set(key, item);
  });

  // Compare received quantities with invoice
  poItems.forEach(poItem => {
    const key = poItem.productId?.toString() || poItem.productName;
    const invoiceItem = invoiceMap.get(key);

    if (invoiceItem) {
      const variance = invoiceItem.quantity - poItem.receivedQuantity;
      const variancePercent = poItem.receivedQuantity > 0
        ? Math.abs(variance / poItem.receivedQuantity) * 100
        : (invoiceItem.quantity > 0 ? 100 : 0);

      if (variancePercent > tolerance) {
        details.push({
          field: 'received_quantity',
          item: poItem.productName,
          expected: poItem.receivedQuantity,
          actual: invoiceItem.quantity,
          variance: variance,
          type: 'receiving_mismatch'
        });
        match = false;
      }
    }
  });

  return { match, details };
};

/**
 * Compares PO prices with Invoice prices
 */
const comparePrices = (poItems, invoiceItems, tolerance) => {
  const details = [];
  const variances = [];
  let match = true;

  // Create a map of invoice items by product
  const invoiceMap = new Map();
  invoiceItems.forEach(item => {
    const key = item.productId?.toString() || item.description;
    invoiceMap.set(key, item);
  });

  // Compare prices
  poItems.forEach(poItem => {
    const key = poItem.productId?.toString() || poItem.productName;
    const invoiceItem = invoiceMap.get(key);

    if (invoiceItem && poItem.unitPrice > 0) {
      const priceVariance = invoiceItem.unitPrice - poItem.unitPrice;
      const priceVariancePercent = Math.abs(priceVariance / poItem.unitPrice) * 100;

      if (priceVariancePercent > tolerance) {
        details.push({
          field: 'unit_price',
          item: poItem.productName,
          expected: poItem.unitPrice,
          actual: invoiceItem.unitPrice,
          variance: priceVariance,
          variancePercent: priceVariancePercent,
          type: 'price_mismatch'
        });
        match = false;
        variances.push({
          productName: poItem.productName,
          poPrice: poItem.unitPrice,
          invoicePrice: invoiceItem.unitPrice,
          variance: priceVariance,
          variancePercent: priceVariancePercent
        });
      }
    }
  });

  return { match, details, variances };
};

/**
 * Gets matching status summary text
 */
const getMatchingStatusText = (matchingResults) => {
  if (matchingResults.poMatch && matchingResults.receivingMatch && matchingResults.priceMatch) {
    return 'Full Match';
  }
  
  const issues = [];
  if (!matchingResults.poMatch) issues.push('PO quantity mismatch');
  if (!matchingResults.receivingMatch) issues.push('Receiving mismatch');
  if (!matchingResults.priceMatch) issues.push('Price mismatch');
  
  return issues.join(', ');
};

module.exports = {
  performThreeWayMatching,
  aggregatePOData,
  compareQuantities,
  compareReceivedQuantities,
  comparePrices,
  getMatchingStatusText,
  DEFAULT_PRICE_TOLERANCE,
  DEFAULT_QUANTITY_TOLERANCE
};
