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

router.get('/products/edit/:id', notAuthorized, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user?.isAdmin) {
            return res.redirect('/');
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        res.render('admin/products/edit', {
            layout: 'admin-layout',
            user,
            product
        });
    } catch (error) {
        console.error('Error loading edit form:', error);
        res.status(500).send('Error loading edit form');
    }
});

router.post('/products/edit/:id', notAuthorized, upload.array('images'), async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user?.isAdmin) {
            return res.redirect('/');
        }

        let existingImages = req.body.existingImages || [];
        if (!Array.isArray(existingImages)) {
            existingImages = [existingImages];
        }

        const newImageUrls = req.files.map(file => `/uploads/products/${file.filename}`);
        const allImages = [...existingImages, ...newImageUrls];

        await Product.findByIdAndUpdate(req.params.id, {
            ...req.body,
            images: allImages
        });

        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).send('Error updating product');
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

router.get('/orders', notAuthorized, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user?.isAdmin) {
            return res.redirect('/');
        }

        const orders = await Order.find({ 
            paymentStatus: 'Completed'  // Only show paid orders
        })
        .populate('userId', 'email')
        .sort({ createdAt: -1 });

        res.render('admin/orders', {
            layout: 'admin-layout',
            user,
            orders
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        res.status(500).send('Error loading orders');
    }
});

router.patch('/orders/:id/status', notAuthorized, async (req, res) => {
    try {
        const { status } = req.body;
        await Order.findByIdAndUpdate(req.params.id, { 
            deliveryStatus: status 
        });
        res.status(200).send('Status updated');
    } catch (error) {
        res.status(500).send('Error updating status');
    }
});

router.get('/users', notAuthorized, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user?.isAdmin) {
            return res.redirect('/');
        }

        // Get users with order counts
        const users = await User.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'orders'
                }
            },
            {
                $project: {
                    email: 1,
                    phone: 1,
                    isVerified: 1,
                    isBlocked: 1,
                    createdAt: 1,
                    orderCount: { $size: '$orders' }
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.render('admin/users', {
            layout: 'admin-layout',
            user,
            users
        });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).send('Error loading users');
    }
});

router.patch('/users/:id/toggle-block', notAuthorized, async (req, res) => {
    try {
        const { blocked } = req.body;
        await User.findByIdAndUpdate(req.params.id, { isBlocked: blocked });
        res.status(200).send('User status updated');
    } catch (error) {
        res.status(500).send('Error updating user status');
    }
});

module.exports = router;