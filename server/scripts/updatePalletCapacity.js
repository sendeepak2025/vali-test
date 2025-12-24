/**
 * Script to update products' palletCapacity.totalCasesPerPallet
 * Based on actual data provided by user + estimates for similar products
 * 
 * Run: node scripts/updatePalletCapacity.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/productModel');

const MONGODB_URI = process.env.MONGODB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/vali';

// Actual pallet capacity data provided by user (product name -> cases per pallet)
const KNOWN_PALLET_CAPACITY = {
  // Exact matches from user data
  'ataulfo': 210,
  'beet': 90,
  'bell green': 56,
  'green bell': 56,
  'bell pepper green': 56,
  'cauliflower': 56,
  'chaokah': 99,
  'chinese okra': 49,
  'cilantro': 56,
  'desi dahi': 60,
  'eggplant': 49,
  'opo squash': 49,
  'opo': 49,
  'thai chilli': 49,
  'thai chili': 49,
  'ginger': 80,
  'red onions 25lb': 81,
  'red onion': 81,
  'onion 50lb jumbo': 40,
  'jumbo onion': 40,
  'yellow onion 50lb': 40,
  'indian okra': 117,
  'okra indian': 117,
  'bittermelon': 49,
  'bitter melon': 49,
  'karela': 49,
  'limes': 60,
  'lime': 60,
  'lychee 10lb': 156,
  'lychee': 156,
  'litchi': 156,
  'papaya': 48,
  'tomato': 81,
  'tomatoes': 81,
  'roma tomato': 81,
  'thai guava': 80,
  'guava': 80,
  'tindora': 60,
  'methi': 56,
  'fenugreek': 56,
};

// Estimated pallet capacity by product category/type
const CATEGORY_ESTIMATES = {
  // Leafy greens & herbs (light, stackable)
  'leafy': 60,
  'herbs': 56,
  'greens': 60,
  
  // Root vegetables (heavy)
  'root': 70,
  'potato': 50,
  'onion': 60,
  
  // Squash family
  'squash': 49,
  'gourd': 49,
  
  // Peppers
  'pepper': 56,
  'chilli': 49,
  'chili': 49,
  
  // Citrus & fruits
  'citrus': 80,
  'mango': 100,
  'fruit': 80,
  
  // Melons (large, heavy)
  'melon': 40,
  'watermelon': 30,
  
  // Beans & pods
  'bean': 60,
  'okra': 100,
  
  // Dairy
  'dairy': 60,
  'dahi': 60,
  'yogurt': 60,
  
  // Default for unknown
  'default': 60
};

// Keywords to match product types
const TYPE_KEYWORDS = {
  leafy: ['spinach', 'lettuce', 'kale', 'chard', 'arugula', 'saag', 'palak'],
  herbs: ['cilantro', 'parsley', 'mint', 'basil', 'dill', 'methi', 'curry leaves', 'pudina'],
  root: ['carrot', 'radish', 'turnip', 'beet', 'mooli', 'ginger', 'turmeric'],
  squash: ['squash', 'zucchini', 'opo', 'lauki', 'tinda', 'tindora', 'parwal', 'gourd'],
  pepper: ['bell', 'pepper', 'capsicum', 'jalapeno', 'serrano'],
  chilli: ['chilli', 'chili', 'mirch', 'thai chili'],
  citrus: ['lime', 'lemon', 'orange', 'grapefruit', 'mosambi'],
  mango: ['mango', 'ataulfo', 'alphonso', 'kesar'],
  melon: ['melon', 'watermelon', 'cantaloupe', 'honeydew'],
  bean: ['bean', 'green bean', 'french bean', 'valor', 'sem'],
  okra: ['okra', 'bhindi', 'lady finger'],
  dairy: ['dahi', 'yogurt', 'paneer', 'cheese', 'milk'],
  onion: ['onion', 'pyaz', 'shallot'],
  potato: ['potato', 'aloo', 'sweet potato'],
  fruit: ['guava', 'papaya', 'banana', 'apple', 'pear', 'lychee', 'litchi', 'jackfruit']
};

function findPalletCapacity(productName) {
  const nameLower = productName.toLowerCase().trim();
  
  // 1. Check exact/partial match in known data
  for (const [key, capacity] of Object.entries(KNOWN_PALLET_CAPACITY)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return { capacity, source: 'known', match: key };
    }
  }
  
  // 2. Check by product type keywords
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (nameLower.includes(keyword)) {
        return { 
          capacity: CATEGORY_ESTIMATES[type] || CATEGORY_ESTIMATES.default, 
          source: 'estimated', 
          match: `${type}:${keyword}` 
        };
      }
    }
  }
  
  // 3. Default estimate
  return { capacity: CATEGORY_ESTIMATES.default, source: 'default', match: 'none' };
}

async function updatePalletCapacity() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const products = await Product.find({}, 'name shortCode palletCapacity category');
    
    console.log('='.repeat(80));
    console.log('PALLET CAPACITY UPDATE');
    console.log('='.repeat(80));
    
    let updated = 0;
    let skipped = 0;
    const results = [];

    for (const product of products) {
      const { capacity, source, match } = findPalletCapacity(product.name);
      const currentCapacity = product.palletCapacity?.totalCasesPerPallet || 0;
      
      // Only update if current is 0 or different
      if (currentCapacity === 0 || currentCapacity !== capacity) {
        await Product.updateOne(
          { _id: product._id },
          { 
            $set: { 
              'palletCapacity.totalCasesPerPallet': capacity,
              'palletCapacity.casesPerLayer': Math.ceil(capacity / 5), // Estimate 5 layers
              'palletCapacity.layersPerPallet': 5
            } 
          }
        );
        updated++;
        results.push({
          code: product.shortCode || '--',
          name: product.name,
          old: currentCapacity,
          new: capacity,
          source,
          match
        });
      } else {
        skipped++;
      }
    }

    // Print results
    console.log('\n📦 UPDATED PRODUCTS:');
    console.log('-'.repeat(80));
    console.log('Code | Product Name                    | Old | New | Source    | Match');
    console.log('-'.repeat(80));
    
    results.forEach(r => {
      const name = r.name.substring(0, 30).padEnd(30);
      const code = (r.code || '--').padEnd(4);
      const oldVal = String(r.old).padStart(3);
      const newVal = String(r.new).padStart(3);
      const src = r.source.padEnd(9);
      console.log(`${code} | ${name} | ${oldVal} | ${newVal} | ${src} | ${r.match}`);
    });

    console.log('-'.repeat(80));
    console.log(`\n✅ Updated: ${updated} products`);
    console.log(`⏭️  Skipped: ${skipped} products (already set)`);
    console.log(`📊 Total: ${products.length} products\n`);

    // Show summary by source
    const bySource = results.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    }, {});
    console.log('📈 By Source:', bySource);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

updatePalletCapacity();
