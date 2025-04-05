const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/user');
const { send } = require('../email');

const { notAuthorized, isAuthorized } = require('../middleware/auth');

router.get('/register', isAuthorized, (req, res) => {
  res.render('user/register', { title: 'Register' });
});

router.post('/register', isAuthorized, async (req, res) => {
  const { email, phone} = req.body;

  try {
    const password = crypto.randomBytes(8).toString('hex');

    const newUser = new User({
      email,
      phone,
      password: await bcrypt.hash(password, 10)
    });

    await newUser.save();

    // Send the password to the user's email
    const subject = 'Welcome to Piecom!';
    const text = `Your account has been created successfully. Your password is: ${password}`;
    const html = `<p>Your account has been created successfully.</p><p><strong>Password:</strong> ${password}</p>`;
    send(email, subject, text, html, (err) => {
      if (err) {
        console.error('Error sending email:', err.message);
        return res.status(500).send('Error sending email. Please try again.');
      }
      res.redirect('/'); // Redirect to the homepage or a success page
    });
  } catch (error) {
    console.error('Error registering user:', error.message);
    res.status(500).send('An error occurred while registering. Please try again.');
  }
});

router.get('/login', isAuthorized, (req, res) => {
  res.render('user/login', { title: 'Login' });
});

router.post('/login', isAuthorized, async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).send('Invalid email or password');
    }

    req.session.user = { id: user._id, email: user.email };
    res.redirect('/'); // Redirect to the homepage or dashboard
  } catch (error) {
    console.error('Error logging in:', error.message);
    res.status(500).send('An error occurred while logging in. Please try again.');
  }
});

router.get('/logout', (req, res) => {
  req.session = null; 
  res.redirect('/'); 
});

module.exports = router;