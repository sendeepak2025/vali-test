const mongoose = require('mongoose');

// Early payment discount sub-schema
const earlyPaymentDiscountSchema = new mongoose.Schema({
    percentage: { type: Number, min: 0, max: 100 },
    withinDays: { type: Number, min: 1 }
}, { _id: false });

// Payment terms sub-schema
const paymentTermsSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['cod', 'net15', 'net30', 'net45', 'net60', 'custom'],
        default: 'net30'
    },
    customDays: { type: Number, min: 1 },
    earlyPaymentDiscount: earlyPaymentDiscountSchema
}, { _id: false });

// Performance thresholds sub-schema
const performanceThresholdsSchema = new mongoose.Schema({
    minOnTimeDeliveryRate: { type: Number, default: 90, min: 0, max: 100 },
    minQualityAcceptanceRate: { type: Number, default: 95, min: 0, max: 100 },
    minFillRate: { type: Number, default: 95, min: 0, max: 100 }
}, { _id: false });

const vendorSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        type: {
            type: String,
            enum: ['farmer', 'supplier', 'distributor', 'other'],
            default: 'supplier',
        },
        contactName: { type: String },
        email: { type: String },
        phone: { type: String },
        address: { type: String },
        notes: { type: String },
        productsSupplied: { type: String },
        
        // Vendor status tracking
        status: {
            type: String,
            enum: ['active', 'inactive', 'on_hold', 'blacklisted'],
            default: 'active'
        },
        statusReason: { type: String },
        statusChangedAt: { type: Date },
        statusChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        
        // Payment terms configuration
        paymentTerms: {
            type: paymentTermsSchema,
            default: () => ({ type: 'net30' })
        },
        
        // Performance thresholds for vendor scorecard
        performanceThresholds: {
            type: performanceThresholdsSchema,
            default: () => ({
                minOnTimeDeliveryRate: 90,
                minQualityAcceptanceRate: 95,
                minFillRate: 95
            })
        },
        
        // Cached performance metrics (updated periodically)
        performanceMetrics: {
            onTimeDeliveryRate: { type: Number, default: 0 },
            qualityAcceptanceRate: { type: Number, default: 0 },
            fillRate: { type: Number, default: 0 },
            averagePaymentDays: { type: Number, default: 0 },
            totalPurchases: { type: Number, default: 0 },
            totalPaid: { type: Number, default: 0 },
            outstandingBalance: { type: Number, default: 0 },
            lastCalculatedAt: { type: Date }
        },
        
        // Flag for vendors below performance thresholds
        isBelowThreshold: { type: Boolean, default: false }
    },
    { timestamps: true }
);

// Helper method to get payment due days based on payment terms
vendorSchema.methods.getPaymentDueDays = function() {
    const termDays = {
        'cod': 0,
        'net15': 15,
        'net30': 30,
        'net45': 45,
        'net60': 60,
        'custom': this.paymentTerms?.customDays || 30
    };
    return termDays[this.paymentTerms?.type] || 30;
};

// Helper method to calculate early payment discount
vendorSchema.methods.calculateEarlyPaymentDiscount = function(invoiceAmount, daysSinceInvoice) {
    const discount = this.paymentTerms?.earlyPaymentDiscount;
    if (!discount || !discount.percentage || !discount.withinDays) {
        return 0;
    }
    if (daysSinceInvoice <= discount.withinDays) {
        return (invoiceAmount * discount.percentage) / 100;
    }
    return 0;
};

// Helper method to check if vendor is below performance thresholds
vendorSchema.methods.checkPerformanceThresholds = function() {
    const metrics = this.performanceMetrics;
    const thresholds = this.performanceThresholds;
    
    if (!metrics || !thresholds) return false;
    
    return (
        metrics.onTimeDeliveryRate < thresholds.minOnTimeDeliveryRate ||
        metrics.qualityAcceptanceRate < thresholds.minQualityAcceptanceRate ||
        metrics.fillRate < thresholds.minFillRate
    );
};

// Index for efficient querying
vendorSchema.index({ status: 1 });
vendorSchema.index({ 'paymentTerms.type': 1 });
vendorSchema.index({ isBelowThreshold: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
