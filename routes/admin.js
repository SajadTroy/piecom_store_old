const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const User = require('../models/user');
const { send } = require('../email');
const Order = require('../models/Order');
const Product = require('../models/Product');

const { notAuthorized, isAuthorized } = require('../middleware/auth');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: 'public/uploads/products/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

router.get('/dashboard', notAuthorized, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user?.isAdmin) {
            return res.redirect('/');
        }

        // Get current and last month dates
        const now = new Date();
        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // Current month stats
        const currentStats = await Promise.all([
            Order.countDocuments({ createdAt: { $gte: firstDayThisMonth } }),
            Order.aggregate([
                { $match: { createdAt: { $gte: firstDayThisMonth }, paymentStatus: 'Completed' } },
                { $group: { _id: null, total: { $sum: '$totalPrice' } } }
            ]),
            User.countDocuments({ createdAt: { $gte: firstDayThisMonth } }),
            Product.countDocuments({ createdAt: { $gte: firstDayThisMonth } })
        ]);

        // Last month stats
        const lastMonthStats = await Promise.all([
            Order.countDocuments({ 
                createdAt: { 
                    $gte: firstDayLastMonth, 
                    $lt: firstDayThisMonth 
                } 
            }),
            Order.aggregate([
                { 
                    $match: { 
                        createdAt: { $gte: firstDayLastMonth, $lt: firstDayThisMonth },
                        paymentStatus: 'Completed'
                    } 
                },
                { $group: { _id: null, total: { $sum: '$totalPrice' } } }
            ]),
            User.countDocuments({ 
                createdAt: { $gte: firstDayLastMonth, $lt: firstDayThisMonth } 
            }),
            Product.countDocuments({ 
                createdAt: { $gte: firstDayLastMonth, $lt: firstDayThisMonth } 
            })
        ]);

        // Calculate percentage changes
        const calculateChange = (current, last) => {
            if (last === 0) return current > 0 ? 100 : 0;
            return ((current - last) / last) * 100;
        };

        const changes = {
            orders: calculateChange(currentStats[0], lastMonthStats[0]),
            revenue: calculateChange(
                currentStats[1][0]?.total || 0, 
                lastMonthStats[1][0]?.total || 0
            ),
            users: calculateChange(currentStats[2], lastMonthStats[2]),
            products: calculateChange(currentStats[3], lastMonthStats[3])
        };

        // Fetch recent orders
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'email')
            .lean();

        const formattedRecentOrders = recentOrders.map(order => ({
            _id: order._id.toString(),
            customer: order.userId.email,
            status: order.deliveryStatus,
            amount: order.totalPrice,
            date: order.createdAt
        }));

        res.render('admin/dashboard', {
            layout: 'admin-layout',
            user,
            totalOrders: currentStats[0],
            totalRevenue: currentStats[1][0]?.total || 0,
            totalUsers: currentStats[2],
            totalProducts: currentStats[3],
            changes,
            monthLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            revenueData: [3000, 4500, 3800, 5200, 4800, 6000],
            orderStatusData: [65, 20, 15],
            recentOrders: formattedRecentOrders
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
});

router.get('/products', notAuthorized, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user?.isAdmin) {
            return res.redirect('/');
        }

        const products = await Product.find().sort({ createdAt: -1 });
        
        res.render('admin/products', {
            layout: 'admin-layout',
            user,
            products
        });
    } catch (error) {
        console.error('Error loading products:', error);
        res.status(500).send('Error loading products');
    }
});

router.get('/products/new', notAuthorized, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user?.isAdmin) {
            return res.redirect('/');
        }
        
        res.render('admin/products/new', {
            layout: 'admin-layout',
            user
        });
    } catch (error) {
        console.error('Error loading new product form:', error);
        res.status(500).send('Error loading form');
    }
});

router.post('/products/new', notAuthorized, upload.array('images'), async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user?.isAdmin) {
            return res.redirect('/');
        }

        const imageUrls = req.files.map(file => `/uploads/products/${file.filename}`);
        const product = new Product({
            ...req.body,
            images: imageUrls
        });

        await product.save();
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).send('Error creating product');
    }
});

// Update stock
router.patch('/products/stock/:id', notAuthorized, async (req, res) => {
    try {
        const { stockQuantity } = req.body;
        await Product.findByIdAndUpdate(req.params.id, { stockQuantity });
        res.status(200).send('Stock updated');
    } catch (error) {
        res.status(500).send('Error updating stock');
    }
});

// Delete product
router.delete('/products/:id', notAuthorized, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.status(200).send('Product deleted');
    } catch (error) {
        res.status(500).send('Error deleting product');
    }
});

module.exports = router;