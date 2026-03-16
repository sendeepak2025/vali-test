# Purchase History API Usage Guide

## ✅ **Haan bhai, ab approve karne par properly show hoga!**

Kyunki maine `updateItemQualityStatus` function fix kar diya hai, ab jab aap approve karenge to:
- ✅ Purchase history properly update hogi
- ✅ UpdatedFromOrders properly update hoga  
- ✅ Total purchase sahi show hoga

## 🔧 **New API Endpoint**

### **GET** `/api/product/purchase-history/:productId`

**Query Parameters:**
- `startDate` (optional) - Filter from this date (YYYY-MM-DD)
- `endDate` (optional) - Filter to this date (YYYY-MM-DD)

**Example Usage:**
```javascript
// Get all purchase history for a product
GET /api/product/purchase-history/65f1234567890abcdef12345

// Get purchase history for specific date range
GET /api/product/purchase-history/65f1234567890abcdef12345?startDate=2025-01-01&endDate=2025-01-31
```

## 📊 **API Response Structure**

```json
{
  "success": true,
  "product": {
    "_id": "65f1234567890abcdef12345",
    "name": "Pakoda Chilli",
    "image": "image_url"
  },
  "summary": {
    "totalPurchaseFromDB": 51,
    "totalUnitPurchaseFromDB": 0,
    "totalQuantityFromOrders": 51,
    "totalWeightFromOrders": 0,
    "purchaseHistoryEntries": 3,
    "lbPurchaseHistoryEntries": 0,
    "updatedFromOrdersEntries": 3,
    "isConsistent": true,
    "lastUpdated": "2026-01-28T10:30:00.000Z"
  },
  "detailedHistory": [
    {
      "purchaseOrderId": "65f9876543210fedcba09876",
      "purchaseOrderNumber": "PO-2026-1234",
      "purchaseDate": "2026-01-20T00:00:00.000Z",
      "vendorName": "ABC Vendor",
      "quantity": 20,
      "totalWeight": 0,
      "lb": null,
      "qualityStatus": "approved",
      "qualityNotes": "",
      "batchNumber": "BATCH001",
      "actualWeight": 18.5,
      "expectedWeight": 20,
      "weightVariance": -1.5,
      "weightVariancePercent": -7.5
    }
  ],
  "dateWiseSummary": [
    {
      "date": "2026-01-20",
      "totalQuantity": 20,
      "totalWeight": 0,
      "purchaseOrders": [
        {
          "purchaseOrderNumber": "PO-2026-1234",
          "vendorName": "ABC Vendor",
          "quantity": 20,
          "totalWeight": 0
        }
      ]
    }
  ],
  "purchaseHistory": [
    {
      "date": "2026-01-20T00:00:00.000Z",
      "quantity": 20
    }
  ],
  "lbPurchaseHistory": [],
  "updatedFromOrders": [
    {
      "purchaseOrder": "65f9876543210fedcba09876",
      "oldQuantity": 0,
      "newQuantity": 20,
      "perLb": null,
      "totalLb": 0,
      "difference": 20
    }
  ]
}
```

## 🎯 **Frontend Implementation Example**

### **React Component for Purchase History Popup**

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PurchaseHistoryModal = ({ productId, isOpen, onClose }) => {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Fetch purchase history when modal opens
  useEffect(() => {
    if (isOpen && productId) {
      fetchPurchaseHistory();
    }
  }, [isOpen, productId, dateRange]);

  const fetchPurchaseHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const response = await axios.get(
        `/api/product/purchase-history/${productId}?${params.toString()}`
      );
      
      if (response.data.success) {
        setHistoryData(response.data);
      }
    } catch (error) {
      console.error('Error fetching purchase history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>🛒 Purchase History</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Date Filter */}
        <div className="date-filter">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({...prev, startDate: e.target.value}))}
            placeholder="Start Date"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({...prev, endDate: e.target.value}))}
            placeholder="End Date"
          />
          <button onClick={fetchPurchaseHistory}>Filter</button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : historyData ? (
          <div>
            {/* Product Info */}
            <div className="product-info">
              <h3>{historyData.product.name}</h3>
              <img src={historyData.product.image} alt={historyData.product.name} />
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
              <div className="card">
                <h4>📊 Total</h4>
                <p>{historyData.summary.totalPurchaseFromDB}</p>
              </div>
              <div className="card">
                <h4>📦 Unit</h4>
                <p>{historyData.summary.totalUnitPurchaseFromDB} lb</p>
              </div>
            </div>

            {/* Date-wise Summary */}
            <div className="date-wise-summary">
              <h4>📅 Date-wise Purchase Summary</h4>
              {historyData.dateWiseSummary.map((dateEntry, index) => (
                <div key={index} className="date-entry">
                  <h5>{new Date(dateEntry.date).toLocaleDateString()}</h5>
                  <p>Total Quantity: {dateEntry.totalQuantity}</p>
                  <div className="purchase-orders">
                    {dateEntry.purchaseOrders.map((po, poIndex) => (
                      <div key={poIndex} className="po-entry">
                        <span>PO: {po.purchaseOrderNumber}</span>
                        <span>Vendor: {po.vendorName}</span>
                        <span>Qty: {po.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed History */}
            <div className="detailed-history">
              <h4>📋 Detailed Purchase History</h4>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>PO Number</th>
                    <th>Vendor</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Batch</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.detailedHistory.map((entry, index) => (
                    <tr key={index}>
                      <td>{new Date(entry.purchaseDate).toLocaleDateString()}</td>
                      <td>{entry.purchaseOrderNumber}</td>
                      <td>{entry.vendorName}</td>
                      <td>{entry.quantity}</td>
                      <td>
                        <span className={`status ${entry.qualityStatus}`}>
                          {entry.qualityStatus}
                        </span>
                      </td>
                      <td>{entry.batchNumber || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Consistency Check */}
            <div className={`consistency-check ${historyData.summary.isConsistent ? 'consistent' : 'inconsistent'}`}>
              {historyData.summary.isConsistent ? '✅ Data is consistent' : '⚠️ Data inconsistency detected'}
            </div>

            <p className="last-updated">
              Last Updated: {new Date(historyData.summary.lastUpdated).toLocaleString()}
            </p>
          </div>
        ) : (
          <div>No data available</div>
        )}
      </div>
    </div>
  );
};

export default PurchaseHistoryModal;
```

### **Usage in Parent Component**

```jsx
const ProductList = () => {
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const handleShowPurchaseHistory = (productId) => {
    setSelectedProductId(productId);
    setShowHistoryModal(true);
  };

  return (
    <div>
      {/* Product List */}
      {products.map(product => (
        <div key={product._id} className="product-card">
          <h3>{product.name}</h3>
          <p>Total Purchase: {product.totalPurchase}</p>
          <button onClick={() => handleShowPurchaseHistory(product._id)}>
            View Purchase History
          </button>
        </div>
      ))}

      {/* Purchase History Modal */}
      <PurchaseHistoryModal
        productId={selectedProductId}
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />
    </div>
  );
};
```

## 🎯 **Key Features**

1. **✅ Sirf Approved Items** - API sirf approved purchase items ka data return karta hai
2. **📅 Date Filtering** - Start date aur end date se filter kar sakte hain
3. **📊 Summary Statistics** - Total purchase, consistency check, etc.
4. **📋 Detailed History** - Har purchase order ki complete details
5. **📅 Date-wise Summary** - Date ke hisab se grouped data
6. **🔍 Consistency Check** - Database aur actual orders ka data match kar raha hai ya nahi

## 🚀 **Ab approve karne par properly show hoga!**

Jab aap purchase order mein koi item approve karenge:
1. ✅ Purchase history update hogi
2. ✅ UpdatedFromOrders update hoga
3. ✅ Total purchase sahi show hoga
4. ✅ API se latest data mil jayega

**Perfect! Ab aapka purchase history system completely working hai!** 🎉