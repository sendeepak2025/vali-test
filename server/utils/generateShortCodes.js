/**
 * Utility to generate short codes for existing products
 * Short codes start from 101 and auto-increment
 * Uses Counter model to maintain sequence
 */

const Counter = require('../models/counterModel');

const generateShortCodesForProducts = async (Product) => {
    try {
        // Get all products without shortCode, sorted by creation date
        const products = await Product.find({ 
            $or: [
                { shortCode: { $exists: false } },
                { shortCode: null },
                { shortCode: '' }
            ]
        }).sort({ createdAt: 1 });

        if (products.length === 0) {
            console.log('All products already have short codes');
            return { updated: 0, message: 'All products already have short codes' };
        }

        // Get or initialize the counter
        let counter = await Counter.findById('productShortCode');
        
        if (!counter) {
            // Check if any products already have shortCodes to determine starting point
            const existingCodes = await Product.find({ 
                shortCode: { $exists: true, $ne: null, $ne: '' } 
            }).select('shortCode');
            
            let maxCode = 100; // Start from 100 so first code will be 101
            existingCodes.forEach(p => {
                const num = parseInt(p.shortCode, 10);
                if (!isNaN(num) && num > maxCode) {
                    maxCode = num;
                }
            });

            // Create counter with the max existing code (or 100 if none exist)
            counter = await Counter.create({ _id: 'productShortCode', seq: maxCode });
        }

        // Assign sequential codes
        const bulkOps = [];
        let currentSeq = counter.seq;

        for (const product of products) {
            currentSeq++;
            bulkOps.push({
                updateOne: {
                    filter: { _id: product._id },
                    update: { $set: { shortCode: String(currentSeq) } }
                }
            });
        }

        // Execute bulk update
        const result = await Product.bulkWrite(bulkOps);

        // Update counter to the last used sequence
        await Counter.findByIdAndUpdate('productShortCode', { seq: currentSeq });

        console.log(`Generated short codes for ${result.modifiedCount} products (${counter.seq + 1} to ${currentSeq})`);
        
        return { 
            updated: result.modifiedCount,
            startCode: counter.seq + 1,
            endCode: currentSeq,
            message: `Short codes assigned from ${counter.seq + 1} to ${currentSeq}`
        };
    } catch (error) {
        console.error('Error generating short codes:', error);
        throw error;
    }
};

module.exports = { generateShortCodesForProducts };
