//Mongo Schema for movie/anime/manga ratings
const mongoose = require('mongoose');


//Many to Many, 2 way reference, userRating collection stores all reviews for a user in an array
//while, userReview collection stores all users that rated on a particular media in an array
//future problems with scale, reviews and users document won't scale past 16mb
//if a certain user or media gets too much reviews, mongodb will crash, when users scale
//must refactor and scale mongodb modeling



//review with user array
const userReviewSchema = new mongoose.Schema({
    user: mongoose.Schema.Types.Mixed,
    rating: Number,
    review: String,
    date: mongoose.Schema.Types.Mixed
})
mongoose.model('userReview', userReviewSchema)

const reviewSchema = new mongoose.Schema({
    mediaID: mongoose.Schema.Types.Mixed,
    title: mongoose.Schema.Types.Mixed,
    img: mongoose.Schema.Types.Mixed,
    mediaType: String,
    avgRating: Number,
    users: [userReviewSchema]
})

const Review = mongoose.model('Review', reviewSchema)
module.exports = Review;