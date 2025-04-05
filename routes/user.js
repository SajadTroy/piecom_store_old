const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/user');
const { send } = require('../email');

const { notAuthorized, isAuthorized } = require('../middleware/auth');

const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Add to cart
router.post('/cart/add', notAuthorized, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user.id;

        // Get product details
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        if (product.stockQuantity < quantity) {
            return res.status(400).send('Not enough stock');
        }

        // Find existing cart or create new one
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, products: [] });
        }

        // Check if product already in cart
        const existingProduct = cart.products.find(p => p.productId.toString() === productId);
        if (existingProduct) {
            existingProduct.quantity = quantity;
        } else {
            cart.products.push({ productId, quantity });
        }

        // Calculate total price
        const cartProducts = await Product.find({
            '_id': { $in: cart.products.map(p => p.productId) }
        });

        cart.totalPrice = cart.products.reduce((total, item) => {
            const product = cartProducts.find(p => p._id.toString() === item.productId.toString());
            return total + (product.sellingPrice * item.quantity);
        }, 0);

        await cart.save();
        res.status(200).send('Added to cart');
    } catch (error) {
        console.error('Cart error:', error);
        res.status(500).send('Error updating cart');
    }
});

module.exports = router;