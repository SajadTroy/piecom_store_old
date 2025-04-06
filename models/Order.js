const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    address: {
        addressLine1: String,
        addressLine2: String,
        landmark: String,
        street: String,
        city: String,
        state: String,
        zip: String,
        country: String
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        quantity: Number,
        price: Number,
        subtotal: Number
    }],
    totalAmount: Number,
    paymentId: String,
    orderId: String,
    status: {
        type: String,
        enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Processing'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending'
    },
    deliveryFee: Number,
    paymentFee: Number
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);