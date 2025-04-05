const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        subtotal: {
            type: Number,
            required: true
        }
    }],
    totalPrice: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Middleware to calculate totals before saving
CartSchema.pre('save', function(next) {
    this.totalPrice = this.products.reduce((total, item) => {
        item.subtotal = item.price * item.quantity;
        return total + item.subtotal;
    }, 0);
    next();
});

const Cart = mongoose.model('Cart', CartSchema);
module.exports = Cart;