const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
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