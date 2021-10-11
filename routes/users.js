const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/user')

//register page
router.get('/register', (req, res) => {
    res.render('users/register', { error: req.flash('error') });
})

//register <form> this app uses passport to register and saves to mongodb
router.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) res.redirect('/')
        });
        req.flash('success', 'Welcome to Re-View');
        res.redirect('/');
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('register')
    }
})

//login page
router.get('/login', (req, res) => {
    res.render('users/login', { error: req.flash('error') })
})

//login <form> this app uses passport to authenticate and pulls data from mongodb
router.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    try {
        req.flash('success', 'Welcome Back');
        if (req.session.urlID) {
            id = req.session.urlID;
            title = req.session.urlTitle;
            mediaType = req.session.mediaType;
            delete req.session.urlID;
            delete req.session.urlTitle;
            delete req.session.returnTo;
            res.redirect(`/search/${id}/${mediaType}/${title}`);
        } else {
            redirectUrl = req.session.returnTo || '/';
            delete req.session.urlID;
            delete req.session.urlTitle;
            delete req.session.returnTo;
            res.redirect(redirectUrl);
        }
    } catch (e) {
        res.redirect('/login')
    }
})

//logout button
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success', "You're logged Out")
    res.redirect('/')
})

module.exports = router;