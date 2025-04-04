const notAuthorized = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

const isAuthorized = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    next();
}

module.exports = { notAuthorized, isAuthorized };
// This middleware checks if the user is logged in or not. If the user is not logged in, it sends a 403 Forbidden response. If the user is logged in, it calls the next middleware function.