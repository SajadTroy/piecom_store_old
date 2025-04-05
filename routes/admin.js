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

module.exports = router;