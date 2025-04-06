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



module.exports = router;