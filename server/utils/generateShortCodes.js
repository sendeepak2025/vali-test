/**
 * Utility to generate short codes for existing products
 * Run this once to add shortCodes to all existing products
 */

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
            return { updated: 0 };
        }

        // Get the highest existing shortCode number
        const existingCodes = await Product.find({ 
            shortCode: { $exists: true, $ne: null, $ne: '' } 
        }).select('shortCode');
        
        let maxCode = 0;
        existingCodes.forEach(p => {
            const num = parseInt(p.shortCode, 10);
            if (!isNaN(num) && num > maxCode) {
                maxCode = num;
            }
        });

        // Assign sequential codes starting from maxCode + 1
        let currentCode = maxCode;
        const bulkOps = products.map(product => {
            currentCode++;
            return {
                updateOne: {
                    filter: { _id: product._id },
                    update: { $set: { shortCode: String(currentCode).padStart(2, '0') } }
                }
            };
        });

        const result = await Product.bulkWrite(bulkOps);
        console.log(`Generated short codes for ${result.modifiedCount} products`);
        return { updated: result.modifiedCount };
    } catch (error) {
        console.error('Error generating short codes:', error);
        throw error;
    }
};

module.exports = { generateShortCodesForProducts };
