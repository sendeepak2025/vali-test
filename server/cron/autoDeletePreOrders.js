const cron = require('node-cron');
const PreOrder = require('../models/preOrderModel');

/**
 * Auto-delete PreOrders that have been soft-deleted for more than 7 days
 * Runs daily at midnight (00:00)
 */
const autoDeletePreOrders = () => {
  // Run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Find and permanently delete PreOrders that were soft-deleted more than 7 days ago
      const result = await PreOrder.deleteMany({
        isDeleted: true,
        deletedAt: { $lte: sevenDaysAgo }
      });

      if (result.deletedCount > 0) {
        console.log(`✅ Auto-deleted ${result.deletedCount} PreOrders older than 7 days`);
      } else {
        console.log('ℹ️ No PreOrders to auto-delete');
      }
    } catch (error) {
      console.error('❌ Error in auto-delete PreOrders cron job:', error);
    }
  });

  console.log('🕐 Auto-delete PreOrders cron job scheduled (runs daily at midnight)');
};

module.exports = autoDeletePreOrders;
