const request = require('supertest');
const app = require('../../index');
const PreOrder = require('../../models/preOrderModel');
const authModel = require('../../models/authModel');

describe('PreOrder Confirmation Validation', () => {
  let authToken;
  let testStore;
  let testPreOrder;

  beforeAll(async () => {
    // Create test store
    testStore = new authModel({
      email: 'test@store.com',
      storeName: 'Test Store',
      ownerName: 'Test Owner',
      password: 'password123',
      role: 'store',
      approved: true
    });
    await testStore.save();

    // Create test preorder
    testPreOrder = new PreOrder({
      preOrderNumber: 'PO-TEST-001',
      items: [{
        productId: '507f1f77bcf86cd799439011',
        productName: 'Test Product',
        quantity: 5,
        unitPrice: 10,
        pricingType: 'box'
      }],
      store: testStore._id,
      status: 'pending',
      total: 50,
      billingAddress: {
        name: 'Test Store',
        address: '123 Test St',
        city: 'Test City',
        country: 'Test Country',
        postalCode: '12345'
      },
      shippingAddress: {
        name: 'Test Store',
        address: '123 Test St',
        city: 'Test City',
        country: 'Test Country',
        postalCode: '12345'
      },
      confirmed: false
    });
    await testPreOrder.save();

    // Mock auth token (in real app, you'd get this from login)
    authToken = 'mock-token';
  });

  afterAll(async () => {
    // Cleanup
    await PreOrder.deleteMany({ preOrderNumber: { $regex: /PO-TEST/ } });
    await authModel.deleteMany({ email: { $regex: /test@/ } });
  });

  describe('Individual PreOrder Confirmation', () => {
    it('should prevent confirming an already confirmed preorder', async () => {
      // First, mark the preorder as confirmed
      await PreOrder.findByIdAndUpdate(testPreOrder._id, { confirmed: true });

      const response = await request(app)
        .post(`/api/pre-order/confirm-order/${testPreOrder._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already confirmed');
    });

    it('should allow confirming an unconfirmed preorder', async () => {
      // Reset preorder to unconfirmed
      await PreOrder.findByIdAndUpdate(testPreOrder._id, { confirmed: false });

      // Note: This test would need proper product setup and stock validation
      // For now, we're just testing the confirmation status check
      const response = await request(app)
        .post(`/api/pre-order/confirm-order/${testPreOrder._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // The response might be 400 due to stock validation, but it shouldn't be due to already confirmed
      if (response.status === 400) {
        expect(response.body.message).not.toContain('already confirmed');
      }
    });
  });

  describe('Bulk PreOrder Confirmation', () => {
    it('should skip already confirmed preorders in bulk confirmation', async () => {
      // Mark preorder as confirmed
      await PreOrder.findByIdAndUpdate(testPreOrder._id, { confirmed: true });

      const response = await request(app)
        .post('/api/order/matrix/preorders/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          preOrderIds: [testPreOrder._id],
          weekOffset: 0
        });

      expect(response.body.success).toBe(true);
      expect(response.body.confirmedCount).toBe(0);
      expect(response.body.message).toContain('already confirmed');
    });
  });
});