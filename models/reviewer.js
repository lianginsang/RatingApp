//Mongo Schema for movie/anime/manga ratings
const mongoose = require('mongoose');


//Many to Many, 2 way reference, userRating collection stores all reviews for a user in an array
//while, userReview collection stores all users that rated on a particular media in an array
//future problems with scale, reviews and users document won't scale past 16mb
//if a certain user or media gets too much reviews, mongodb will crash, when users scale
//must refactor and scale mongodb modeling

//user with review array
const rateSchema = new mongoose.Schema({
    mediaID: mongoose.Schema.Types.Mixed,
    title: mongoose.Schema.Types.Mixed,
    img: mongoose.Schema.Types.Mixed,
    mediaType: String,
    rating: Number,
    review: String,
    date: mongoose.Schema.Types.Mixed
})
mongoose.model('Rate', rateSchema)

const reviewerSchema = new mongoose.Schema({
    user: mongoose.Schema.Types.Mixed,
    reviews: [rateSchema]
})
const Reviewer = mongoose.model('Reviewer', reviewerSchema)
module.exports = Reviewer;
