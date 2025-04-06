const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
            },
            sellingPrice: {
                type: Number,
                required: true,
                min: 0,
            },
            productPrice: {
                type: Number,
                required: true,
                min: 0,
            },
            discountPercentage: {
                type: Number,
                required: true,
                min: 0,
            },
        },
    ],
    orderDate: {
        type: Date,
        default: Date.now,
    },
    shippingAddress: {
        street: {
          type: String,
          default: '',
        },
        city: {
          type: String,
          default: '',
        },
        state: {
          type: String,
          enum: [
            'Andaman and Nicobar Islands',
            'Andhra Pradesh',
            'Arunachal Pradesh',
            'Assam',
            'Bihar',
            'Chandigarh',
            'Chhattisgarh',
            'Dadra and Nagar Haveli and Daman and Diu',
            'Delhi',
            'Goa',
            'Gujarat',
            'Haryana',
            'Himachal Pradesh',
            'Jammu and Kashmir',
            'Jharkhand',
            'Karnataka',
            'Kerala',
            'Ladakh',
            'Lakshadweep',
            'Madhya Pradesh',
            'Maharashtra',
            'Manipur',
            'Meghalaya',
            'Mizoram',
            'Nagaland',
            'Odisha',
            'Puducherry',
            'Punjab',
            'Rajasthan',
            'Sikkim',
            'Tamil Nadu',
            'Telangana',
            'Tripura',
            'Uttar Pradesh',
            'Uttarakhand',
            'West Bengal',
            ''
          ],
          default: '',
        },
        zip: {
          type: String,
          default: '',
        },
        country: {
          type: String,
          default: 'India',
          enum: ['India'],
        },
        addressLine1: {
          type: String,
          default: '',
        },
        addressLine2: {
          type: String,
          default: '',
        },
        landmark: {
          type: String,
          default: '',
        },
      },
    deliveryStatus: {
        type: String,
        enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending',
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending',
    },
    paymentMethod: {
        type: String,
        enum: ['Cash On Delivery', 'Online'],
        default: 'Online',
    },
    paymentId: {
        type: String,
        required: true,
    },
    transactionId: {
        type: String,
        required: true,
    },
    deliveryCharges: {
        type: Number,
        required: true,
        default: 60,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
}, { timestamps: true });


const Order = mongoose.model('Order', orderSchema);

module.exports = Order;