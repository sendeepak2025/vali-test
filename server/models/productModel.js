const mongoose = require("mongoose");
const { calculatePalletCapacity } = require("../utils/palletCalculator");
const Counter = require("./counterModel");


const updatedFromOrdersSchema = new mongoose.Schema({
    purchaseOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder',

    },
    oldQuantity: {
        type: Number,

    },
    newQuantity: {
        type: Number,

    },
    perLb: {
        type: Number,

    },
    totalLb: {
        type: Number,

    },
    difference: {
        type: Number,

    },
}, { _id: false });


const ProductSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        // Short code for quick product entry (2-3 digits)
        shortCode: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },




        quantity: {
            type: Number,
            default: 0,
        },
        // BOXES
        totalSell: {
            type: Number,
            default: 0,
        },
        totalPurchase: {
            type: Number,
            default: 0,
        },
        remaining: {
            type: Number,
            default: 0,
        },
        // LB's
        unitPurchase: {
            type: Number,
            required: true,
            default: 0,
        },
        unitRemaining: {
            type: Number,
            required: true,
            default: 0,
        },
        unitSell: {
            type: Number,
            required: true,
            default: 0,
        },



        purchaseHistory: [
            {
                date: { type: Date, required: true },
                quantity: { type: Number, default: 0 },
            }
        ],
        salesHistory: [
            {
                date: { type: Date, required: true },
                quantity: { type: Number, default: 0 },
            }
        ],
        lbPurchaseHistory: [
            {
                date: { type: Date, required: true },
                weight: { type: Number, default: 0 },
                lb: { type: String }
            }
        ],
        lbSellHistory: [
            {
                date: { type: Date, required: true },
                weight: { type: Number, default: 0 },
                lb: { type: String }
            }
        ],


        quantityTrash: [
            {
                quantity: { type: Number, required: true },
                type: { type: String, enum: ['box', 'unit'], required: true },
                reason: { type: String, default: 'expired' },
                date: { type: Date, default: Date.now }
            }
        ],
        manuallyAddBox:   {
                quantity: { type: Number, required: true,default:0 },
                date: { type: Date, default: Date.now },
                
            },
        manuallyAddUnit:   {
                quantity: { type: Number, required: true,default:0 },
                date: { type: Date, default: Date.now }
            },

        unit: {
            type: String,


        },
        price: {
            type: Number,
            required: true,
            default: 0,
        },
        threshold: {
            type: Number,
            default: 0,
        },
        description: {
            type: String,
            required: true,
        },
        enablePromotions: {
            type: Boolean,
            default: false,
        },
        palette: {
            type: String,
        },
        bulkDiscount: [
            {
                minQuantity: { type: Number, required: true },
                discountPercent: { type: Number, required: true },
                quantity: { type: Number },
                discountPercentage: { type: Number },
            }
        ],
        weightVariation: {
            type: Number,
            default: 0,
        },
        expiryDate: {
            type: Date,
        },
        batchInfo: {
            type: String,
        },
        origin: {
            type: String,
        },
        organic: {
            type: Boolean,
            default: false,
        },
        storageInstructions: {
            type: String,
        },
        boxSize: {
            type: Number,
            default: 0,
        },
        pricePerBox: {
            type: Number,
            default: 0,
        },
        // Price Tiers for different store categories
        aPrice: {
            type: Number,
            default: 0,
        },
        bPrice: {
            type: Number,
            default: 0,
        },
        cPrice: {
            type: Number,
            default: 0,
        },
        restaurantPrice: {
            type: Number,
            default: 0,
        },
        image:
        {
            type: String,
        },
        shippinCost: {
            type: Number,
            default: 0
        },
        updatedFromOrders: {
            type: [updatedFromOrdersSchema],
            default: []
        },

        // Sales mode configuration - determines how product can be sold
        // "unit" = sell by individual units (lb, oz, pieces)
        // "case" = sell by whole cases only (DEFAULT)
        // "both" = customer can choose either method
        salesMode: {
            type: String,
            enum: ["unit", "case", "both"],
            default: "case"
        },

        // Case dimensions for pallet calculation (in inches)
        caseDimensions: {
            length: { type: Number, default: 0, min: 0 },
            width: { type: Number, default: 0, min: 0 },
            height: { type: Number, default: 0, min: 0 }
        },

        // Case weight in lbs (for pallet weight limit calculation)
        caseWeight: {
            type: Number,
            default: 0,
            min: 0
        },

        // Pallet input mode - 'auto' calculates from dimensions, 'manual' uses direct input
        palletInputMode: {
            type: String,
            enum: ["auto", "manual"],
            default: "auto"
        },

        // Manual cases per pallet - used when palletInputMode is 'manual'
        // e.g., "This product comes 60 cases per pallet"
        manualCasesPerPallet: {
            type: Number,
            default: 0,
            min: 0
        },

        // Cached pallet capacity (auto-calculated on save when dimensions change)
        // Note: These are estimates only - verify for actual shipping
        palletCapacity: {
            casesPerLayer: { type: Number, default: 0 },
            layersPerPallet: { type: Number, default: 0 },
            totalCasesPerPallet: { type: Number, default: 0 },
            isManual: { type: Boolean, default: false }
        }


    },
    { timestamps: true }
);

// Pre-save hook to auto-generate shortCode if not provided
ProductSchema.pre('save', async function(next) {
    if (!this.shortCode) {
        // Find and increment the counter atomically
        const counter = await Counter.findByIdAndUpdate(
            'productShortCode',
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.shortCode = String(counter.seq);
    }
    next();
});

// Pre-save hook to automatically calculate pallet capacity when dimensions change
ProductSchema.pre('save', function(next) {
    // Check if using manual mode
    if (this.palletInputMode === 'manual') {
        // Manual mode - use the manually entered value with actual dimension validation
        if (this.isModified('manualCasesPerPallet') || this.isModified('palletInputMode') || 
            this.isModified('caseDimensions') || this.isModified('caseWeight')) {
            
            const casesPerPallet = this.manualCasesPerPallet || 0;
            let casesPerLayer = 0;
            let layersUsed = 0;
            
            // Calculate from actual dimensions if provided
            if (this.caseDimensions && 
                this.caseDimensions.length > 0 && 
                this.caseDimensions.width > 0 && 
                this.caseDimensions.height > 0) {
                
                const capacity = calculatePalletCapacity(this.caseDimensions, this.caseWeight);
                if (capacity) {
                    casesPerLayer = capacity.casesPerLayer;
                    layersUsed = Math.ceil(casesPerPallet / casesPerLayer);
                }
            }
            
            this.palletCapacity = {
                casesPerLayer: casesPerLayer,
                layersPerPallet: layersUsed,
                totalCasesPerPallet: casesPerPallet,
                isManual: true
            };
        }
        return next();
    }

    // Auto mode - calculate from dimensions
    // Check if caseDimensions or caseWeight has been modified
    const dimensionsModified = this.isModified('caseDimensions.length') || 
                               this.isModified('caseDimensions.width') || 
                               this.isModified('caseDimensions.height') ||
                               this.isModified('caseWeight') ||
                               this.isModified('palletInputMode');
    
    // Also calculate on new documents with dimensions
    const isNewWithDimensions = this.isNew && 
                                this.caseDimensions && 
                                this.caseDimensions.length > 0 && 
                                this.caseDimensions.width > 0 && 
                                this.caseDimensions.height > 0;

    if (dimensionsModified || isNewWithDimensions) {
        const capacity = calculatePalletCapacity(this.caseDimensions, this.caseWeight);
        
        if (capacity && !capacity.error) {
            this.palletCapacity = {
                casesPerLayer: capacity.casesPerLayer,
                layersPerPallet: capacity.layersPerPallet,
                totalCasesPerPallet: capacity.totalCasesPerPallet
            };
        } else {
            // Reset to zeros if calculation fails
            this.palletCapacity = {
                casesPerLayer: 0,
                layersPerPallet: 0,
                totalCasesPerPallet: 0
            };
        }
    }
    
    next();
});

module.exports = mongoose.model("Product", ProductSchema);
