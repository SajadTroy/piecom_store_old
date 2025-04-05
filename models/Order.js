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
    deliveryAddress: {
        type: String,
        required: true,
        trim: true,
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