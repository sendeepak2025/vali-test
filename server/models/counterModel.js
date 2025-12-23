const mongoose  = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, 
  seq: { type: Number, default: 100 }, // Default 100 so first increment gives 101
});


module.exports = mongoose.model('Counter', counterSchema);
