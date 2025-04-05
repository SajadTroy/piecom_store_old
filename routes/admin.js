const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/user');
const { send } = require('../email');
const Order = require('../models/Order');
const Product = require('../models/Product');

const { notAuthorized, isAuthorized } = require('../middleware/auth');

router.get('/dashboard', notAuthorized, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user?.isAdmin) {
            return res.redirect('/');
        }

        // Fetch analytics data
        const totalOrders = await Order.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalRevenue = await Order.aggregate([
            { $match: { paymentStatus: 'Completed' } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]);

        // Recent orders
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'email');

        res.render('admin/dashboard', {
            layout: 'admin-layout',
            user,
            totalOrders,
            totalUsers,
            totalProducts,
            totalRevenue: totalRevenue[0]?.total || 0,
            recentOrders: recentOrders.map(order => ({
                _id: order._id,
                customer: order.userId.email,
                status: order.deliveryStatus,
                amount: order.totalPrice,
                date: order.createdAt
            })),
            monthLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            revenueData: [3000, 4500, 3800, 5200, 4800, 6000],
            orderStatusData: [65, 20, 15]
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
});

module.exports = router;