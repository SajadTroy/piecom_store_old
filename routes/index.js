const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/user');
const { send } = require('../email');

const { notAuthorized, isAuthorized } = require('../middleware/auth');

router.get('/', async (req, res) => {
    try {
        let user = req.session.user || null;
        if (user) {
            user =  await User.findById(user.id).select('-password');
        }
        console.log('User:', user);
        
        res.render('user/index', { title: 'Home', user });
    } catch (error) {
        console.error('Error rendering index page:', error.message);
        res.status(500).send('An error occurred while rendering the page. Please try again.');
    }
});

module.exports = router;