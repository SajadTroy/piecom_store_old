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
    validate: {
      validator: function (v) {
        return v <= this.productPrice;
      },
      message: 'Selling price must be less than or equal to the product price.',
    },
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
    validate: {
      validator: function (v) {
        return v <= 100;
      },
      message: 'Discount percentage must be less than or equal to 100.',
    },
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
}, { 
  timestamps: true 
});

productSchema.pre('save', function (next) {
  if (this.productPrice > 0 && this.sellingPrice > 0) {
    this.discountPercentage = ((this.productPrice - this.sellingPrice) / this.productPrice) * 100;
  }
  next();
});


const Product = mongoose.model('Product', productSchema);

module.exports = Product;