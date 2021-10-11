/*  const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const isLoggedIn = require('../middleware');
const router = express.Router();
const Rating = require('../models/rating')

router.post('/rate/:id', isLoggedIn, async (req, res) => {
    const username = req.user.username;
    const { id } = JSON.stringify(req.params);
    const { rating } = req.body;
    const rated = new Rating({ user: username, mediaID: id, rating: rating });
    await rated.save();
    req.flash('success', 'Rating Submitted');
    res.redirect(`/search/:${id}`);
})

module.exports = router;
*/
