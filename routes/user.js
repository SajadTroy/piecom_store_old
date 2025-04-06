const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/user');
const { send } = require('../email');

const { notAuthorized, isAuthorized } = require('../middleware/auth');

const Cart = require('../models/Cart');
const Product = require('../models/Product');
const razorpay = require('../config/razorpay');
const Order = require('../models/Order');

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

        // Find existing cart or create new one
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, products: [] });
        }

        // Check if product already in cart
        const existingProduct = cart.products.find(p => p.productId.toString() === productId);
        if (existingProduct) {
            // Add new quantity to existing quantity
            const newQuantity = existingProduct.quantity + quantity;
            
            // Check if new total quantity exceeds stock
            if (newQuantity > product.stockQuantity) {
                return res.status(400).send('Not enough stock');
            }
            
            existingProduct.quantity = newQuantity;
            existingProduct.subtotal = product.sellingPrice * newQuantity;
        } else {
            // Check if initial quantity exceeds stock
            if (quantity > product.stockQuantity) {
                return res.status(400).send('Not enough stock');
            }

            cart.products.push({ 
                productId, 
                quantity,
                price: product.sellingPrice,
                subtotal: product.sellingPrice * quantity
            });
        }

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

// Get checkout page
router.get('/checkout', notAuthorized, async (req, res) => {
    try {
        let user = await User.findById(req.session.user.id).select('-password');
        let cart = await Cart.findOne({ userId: user.id }).populate('products.productId');

        if (!cart || !cart.products.length) {
            return res.redirect('/cart');
        }

        res.render('user/checkout', {
            meta: {
                title: 'Checkout',
                description: 'Complete your order',
                image: '/images/default.jpg'
            },
            user,
            cart
        });
    } catch (error) {
        console.error('Error loading checkout:', error);
        res.status(500).send('Error loading checkout');
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

// Create order
router.post('/create-order', notAuthorized, async (req, res) => {
    try {
        const { address } = req.body;
        const userId = req.session.user.id;
        
        const cart = await Cart.findOne({ userId }).populate('products.productId');
        if (!cart || !cart.products.length) {
            return res.status(400).send('Cart is empty');
        }

        const amount = cart.totalPrice + 60; // Total + delivery charge
        const paymentFee = Math.round((amount * 2) / 100); // 2% payment gateway fee
        const totalAmount = amount + paymentFee;

        const order = await razorpay.orders.create({
            amount: totalAmount * 100, // Convert to paisa
            currency: 'INR',
            receipt: `order_${Date.now()}`
        });

        res.json({ 
            order,
            amount: totalAmount,
            paymentFee
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).send('Error creating order');
    }
});

// Get orders page
router.get('/orders', notAuthorized, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id).select('-password');
        const orders = await Order.find({ userId: user.id })
            .populate('products.productId')
            .sort({ createdAt: -1 });

        res.render('user/orders', {
            meta: {
                title: 'My Orders',
                description: 'View your orders',
                image: '/images/default.jpg'
            },
            user,
            orders
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        res.status(500).send('Error loading orders');
    }
});

// Verify payment
router.post('/verify-payment', notAuthorized, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, address } = req.body;
        const userId = req.session.user.id;

        // Verify signature
        const generated = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generated !== razorpay_signature) {
            return res.status(400).send('Payment verification failed');
        }

        const cart = await Cart.findOne({ userId }).populate('products.productId');
        
        // Check stock availability
        for (const item of cart.products) {
            const product = item.productId;
            if (product.stockQuantity < item.quantity) {
                return res.status(400).send(`${product.name} is out of stock`);
            }
        }

        // Create order
        const order = new Order({
            userId,
            address,
            products: cart.products.map(item => ({
                productId: item.productId._id,
                quantity: item.quantity,
                price: item.productId.sellingPrice,
                subtotal: item.subtotal
            })),
            totalAmount: cart.totalPrice + 60 + Math.round((cart.totalPrice + 60) * 0.02),
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            deliveryFee: 60,
            paymentFee: Math.round((cart.totalPrice + 60) * 0.02),
            paymentStatus: 'Completed'
        });

        await order.save();

        // Update product stock
        for (const item of cart.products) {
            await Product.findByIdAndUpdate(
                item.productId._id,
                { $inc: { stockQuantity: -item.quantity } }
            );
        }

        // Clear cart
        await Cart.findOneAndDelete({ userId });

        res.json({ 
            success: true,
            orderId: order._id 
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).send('Error verifying payment');
    }
});

module.exports = router;