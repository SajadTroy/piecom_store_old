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
            existingProduct.subtotal = product.sellingPrice * quantity;
        } else {
            cart.products.push({ 
                productId, 
                quantity,
                price: product.sellingPrice,
                subtotal: product.sellingPrice * quantity
            });
        }

        // Calculate total price
        const cartProducts = await Product.find({
            '_id': { $in: cart.products.map(p => p.productId) }
        });

        cart.totalPrice = cart.products.reduce((total, item) => {
            const product = cartProducts.find(p => p._id.toString() === item.productId.toString());
            return total + item.subtotal;
        }, 0);

        await cart.save();
        res.status(200).send('Added to cart');
    } catch (error) {
        console.error('Cart error:', error);
        res.status(500).send('Error updating cart');
    }
});

// Get cart page
router.get('/cart', notAuthorized, async (req, res) => {
    try {
        let user = await User.findById(req.session.user.id).select('-password');
        let cart = await Cart.findOne({ userId: user.id }).populate('products.productId');

        res.render('user/cart', {
            meta: {
                title: 'Shopping Cart',
                description: 'Your shopping cart',
                image: '/images/default.jpg'
            },
            user,
            cart
        });
    } catch (error) {
        console.error('Error loading cart:', error);
        res.status(500).send('Error loading cart');
    }
});

// Update cart item quantity
router.patch('/cart/update', notAuthorized, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user.id;

        const cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).send('Cart not found');

        const product = await Product.findById(productId);
        if (!product) return res.status(404).send('Product not found');

        if (product.stockQuantity < quantity) {
            return res.status(400).send('Not enough stock');
        }

        const cartProduct = cart.products.find(p => p.productId.toString() === productId);
        if (!cartProduct) return res.status(404).send('Product not in cart');

        cartProduct.quantity = quantity;
        cartProduct.subtotal = product.sellingPrice * quantity;
        
        cart.totalPrice = cart.products.reduce((total, item) => total + item.subtotal, 0);

        await cart.save();
        res.status(200).send('Cart updated');
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).send('Error updating cart');
    }
});

// Remove item from cart
router.delete('/cart/remove', notAuthorized, async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user.id;

        const cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).send('Cart not found');

        cart.products = cart.products.filter(p => p.productId.toString() !== productId);
        cart.totalPrice = cart.products.reduce((total, item) => total + item.subtotal, 0);

        await cart.save();

        res.status(200).send('Item removed');
    } catch (error) {
        console.error('Error removing item:', error);
        res.status(500).send('Error removing item');
    }
});

module.exports = router;