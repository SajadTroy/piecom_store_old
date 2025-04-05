const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const morgan = require("morgan");
const path = require('path');
const cookieSession = require('cookie-session');
const expressLayouts = require('express-ejs-layouts');
const fs = require("fs");

const accessLogStream = fs.createWriteStream(
    path.join(__dirname, "access.log"),
    { flags: "a" }
);

morgan.token('status', (req, res) => {
    const status = res.statusCode;
    let color = status >= 500 ? 'red'    // server error
        : status >= 400 ? 'yellow' // client error
            : status >= 300 ? 'cyan'   // redirection
                : status >= 200 ? 'green'  // success
                    : 'reset';                 // default

    return colors[color](status);
});

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(
    morgan((tokens, req, res) => {
        return [
            colors.blue(tokens.method(req, res)),
            colors.magenta(tokens.url(req, res)),
            tokens.status(req, res),
            colors.cyan(tokens['response-time'](req, res) + ' ms'),
        ].join(' ');
    })
);
app.use(morgan("combined", { stream: accessLogStream }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(cookieSession({
    name: 'session',
    keys: ['hi@23', 'hello@23'],
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
})); 

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/index'));
app.use('/', require('./routes/user'));
app.use('/auth', require('./routes/auth'));

app.use((req, res) => {
    res.status(404).render('notfound', {
        title: '404 - Page Not Found',
        req: req,
        error: '404 - Page Not Found'
    });
});

mongoose.connect('mongodb://localhost:27017/piecom')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});