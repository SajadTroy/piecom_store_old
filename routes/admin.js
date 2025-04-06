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


module.exports = router;