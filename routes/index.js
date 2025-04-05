const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/user');
const Product = require('../models/Product');
const { send } = require('../email');

const { notAuthorized, isAuthorized } = require('../middleware/auth');

router.get('/', async (req, res) => {
    try {
        let user = req.session.user || null;
        if (user) {
            user = await User.findById(user.id).select('-password');
        }

        // Fetch latest products
        const latestProducts = await Product.find()
            .sort({ createdAt: -1 })
            .limit(5);

        // Fetch products with highest stock (as trending)
        const trendingProducts = await Product.find()
            .sort({ stockQuantity: -1 })
            .limit(5);

        // Fetch random products for recommendations
        const recommendedProducts = await Product.aggregate([
            { $match: { stockQuantity: { $gt: 0 } } },
            { $sample: { size: 5 } }
        ]);
        
        res.render('user/index', { 
            title: 'Home', 
            user,
            latestProducts,
            trendingProducts,
            recommendedProducts
        });
    } catch (error) {
        console.error('Error rendering index page:', error.message);
        res.status(500).send('An error occurred while rendering the page. Please try again.');
    }
});

module.exports = router;