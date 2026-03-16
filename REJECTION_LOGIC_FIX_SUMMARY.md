# Purchase Order Rejection Logic Fix Summary

## समस्या (Problem)
जब कोई purchase order item पहले **approved** था और बाद में **rejected** किया जाता था, तो product की quantity properly reduce नहीं हो रही थी।

## मुख्य Issues
1. `approvedPurchases` variable undefined था
2. Purchase history properly update नहीं हो रही थी जब items को reject करते थे
3. Weight-based purchase history भी properly handle नहीं हो रही थी

## Fix किए गए Changes

### 1. Missing Variable Fix
```javascript
// Get all approved purchase orders for checking same date purchases
const approvedPurchases = await PurchaseOrder.find({
  'items.qualityStatus': 'approved'
}).populate('items.productId', 'name');
```

### 2. Missing Import Fix
```javascript
const authModel = require('../models/authModel');
```

### 3. Improved Rejection Logic
```javascript
// ✅ Case 1: Approved -> Rejected
if (wasApprovedBefore && isRejectedNow) {
  // Reduce product quantities
  product.quantity -= oldItemQuantity;
  product.totalPurchase -= oldItemQuantity;
  product.remaining -= oldItemQuantity;
  product.unitPurchase -= existingTotalWeight;
  product.unitRemaining -= existingTotalWeight;

  // Remove from updatedFromOrders log
  if (logEntry) {
    product.updatedFromOrders = product.updatedFromOrders.filter(
      e => e.purchaseOrder.toString() !== purchaseOrderId
    );
  }

  // Handle purchase history - subtract the rejected quantity
  const orderDate = new Date(order.purchaseDate).toISOString().split('T')[0];
  const existingHistoryEntry = product.purchaseHistory.find(p => {
    const historyDate = new Date(p.date).toISOString().split('T')[0];
    return historyDate === orderDate;
  });

  if (existingHistoryEntry) {
    existingHistoryEntry.quantity -= oldItemQuantity;
    
    // Remove entry if quantity becomes 0 or negative
    if (existingHistoryEntry.quantity <= 0) {
      product.purchaseHistory = product.purchaseHistory.filter(p => p !== existingHistoryEntry);
    }
  }

  // Handle lb purchase history - subtract the rejected weight
  if (existingLb && existingTotalWeight) {
    const existingLbHistoryEntry = product.lbPurchaseHistory.find(p => {
      const historyDate = new Date(p.date).toISOString().split('T')[0];
      return historyDate === orderDate && p.lb === existingLb;
    });

    if (existingLbHistoryEntry) {
      existingLbHistoryEntry.weight -= existingTotalWeight;
      
      // Remove entry if weight becomes 0 or negative
      if (existingLbHistoryEntry.weight <= 0) {
        product.lbPurchaseHistory = product.lbPurchaseHistory.filter(p => p !== existingLbHistoryEntry);
      }
    }
  }

  console.log("❌ Rejected after approval. Removed quantity:", oldItemQuantity, "from product:", product.name);
}
```

## Test Results
✅ API endpoint अब properly काम कर रहा है  
✅ Rejection logic properly product quantities को reduce करता है  
✅ Purchase history properly update होती है  
✅ Weight-based history भी properly handle होती है  

## Valid Rejection Reasons
Purchase model में ये valid rejection reasons हैं:
- `spoilage`
- `bruising` 
- `size_variance`
- `temperature_damage`
- `pest_damage`
- `ripeness_issues`
- `color_defects`
- `mold`
- `weight_variance`
- `packaging_damage`
- `contamination`
- `other`
- `''` (empty string)

## API Usage
```javascript
PUT /api/v1/purchase-orders/update-quality/{purchaseOrderId}

Body: [
  {
    "_id": "item_id",
    "productId": { "_id": "product_id" },
    "quantity": 2,
    "qualityStatus": "rejected", // approved -> rejected
    "qualityNotes": "Quality issue found",
    "rejectionReason": "spoilage", // Must be valid enum value
    "batchNumber": "BATCH001",
    "expectedWeight": 50,
    "actualWeight": 48,
    "weightVariance": -2,
    "weightVariancePercent": -4,
    "totalWeight": 48,
    "mediaUrls": []
  }
]
```

अब जब भी कोई item को approved से rejected करेंगे, तो product की quantities properly reduce हो जाएंगी।