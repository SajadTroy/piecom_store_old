const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  images: {
    type: [String],
    required: true,
    validate: {
      validator: function (v) {
        return v.length > 0;
      },
      message: 'At least one image URL is required.',
    },
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  productPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  deliveryCharges: {
    type: Number,
    required: true,
    min: 0,
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 0,
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Electronics',
    ],
    default: 'Electronics',
  },
  stockQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
}, { timestamps: true });


const Product = mongoose.model('Product', productSchema);

module.exports = Product;