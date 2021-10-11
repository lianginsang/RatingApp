const Rating = require("./models/review");
const BaseJoi = require('joi');
const { sanitize } = require("express-mongo-sanitize");
const sanitizeHTML = require('sanitize-html');

//sanitizes html to prevent xss
const extension = (joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.escapeHTML': '{{#label}} must not include HTML'
    },
    rules: {
        escapeHTML: {
            validate(value, helpers) {
                const clean = sanitizeHTML(value, {
                    allowedTags: [],
                    allowedAttributes: {},
                });
                if (clean != value) return helpers.error('string.escapeHTML', { value })
                return clean;
            }
        }
    }
})

const Joi = BaseJoi.extend(extension);

//req.session.returnTo will redirect users to the page of the movie they tried to review
module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        if ('rate' == req.originalUrl.toString().substring(1, 5)) {
            req.session.urlID = req.params.id;
            req.session.urlTitle = req.params.title;
        }
        req.flash('error', 'You must be signed in first!')
        return res.redirect('/login')
    }
    next();
}

// used to save params for animeManga search, it has different search params from movie api
//req.session.storage will delete previous value when new value is presented.
//future concerns - this method is too techincal and we can't have users skip steps for faster experience
module.exports.saveSearchType = (req, res, next) => {
    const { searchTerm } = req.body;
    const { mediaType } = req.body;
    if (mediaType != null) {
        req.session.searchTerm = searchTerm;
        req.session.mediaType = mediaType;
        next();
    } else {
        next();
    }
}

//user is verified by isLoggedIn
//validates with Joi to make sure ratings are between 0-10
module.exports.validateReview = (req, res, next) => {
    const reviewerSchema = Joi.object({
        rating: Joi.number().min(0).max(10).required(),
        review: Joi.string().escapeHTML()
    })
    const { error } = reviewerSchema.validate(req.body);
    if (error) {
        res.render('validateError', { error })
    } else {
        next()
    }
}

//validates post, both generic and title based
module.exports.validatePost = (req, res, next) => {
    const postSchema = Joi.object({
        subject: Joi.string().escapeHTML(),
        body: Joi.string().escapeHTML()
    })
    const { error } = postSchema.validate(req.body);
    if (error) {
        res.render('validateError', { error })
    } else {
        next()
    }
}

//validate replies
module.exports.validateReply = (req, res, next) => {
    const replySchema = Joi.object({
        reply: Joi.string().escapeHTML()
    })
    const { error } = replySchema.validate(req.body);
    if (error) {
        res.render('validateError', { error })
    } else {
        next()
    }
}



