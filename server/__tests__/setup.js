const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

// Connect to in-memory database before tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // Ensure indexes are created
  await mongoose.connection.syncIndexes();
});

// Clear database between tests (but keep indexes)
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Disconnect and stop server after tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Mock mailSender to prevent actual emails during tests
jest.mock("../utils/mailSender", () => {
  return jest.fn().mockResolvedValue("Email sent successfully");
});
