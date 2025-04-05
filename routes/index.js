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

router.get('/products/:type', async (req, res) => {
    try {
        let user = req.session.user || null;
        if (user) {
            user = await User.findById(user.id).select('-password');
        }

        let products = [];
        const type = req.params.type;
        let title = '';

        switch (type) {
            case 'recommended':
                products = await Product.aggregate([
                    { $match: { stockQuantity: { $gt: 0 } } },
                    { $sample: { size: 20 } }
                ]);
                title = 'Recommended Products';
                break;

            case 'trending':
                products = await Product.find()
                    .sort({ stockQuantity: -1 })
                    .limit(20);
                title = 'Trending Products';
                break;

            case 'latest':
                products = await Product.find()
                    .sort({ createdAt: -1 })
                    .limit(20);
                title = 'Latest Products';
                break;

            default:
                return res.status(404).render('notfound', { 
                    title: '404 - Page Not Found',
                    user,
                    error: 'Category not found'
                });
        }

        res.render('user/products', {
            title,
            user,
            products,
            category: type
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Error fetching products');
    }
});

module.exports = router;