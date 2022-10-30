if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

//npm packages
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const Joi = require('joi');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local')
const LocalPassport = require('passport-local');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const MongoDBStore = require('connect-mongo');

//middleware
const userRoutes = require('./routes/users');
const { isLoggedIn, saveSearchType, validateReview, validatePost, validateReply } = require('./middleware');

//error handlers
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');

//variables for better syntax
const app = express();
const router = express.Router();
const Review = require('./models/review');
const Reviewer = require('./models/reviewer');
const User = require('./models/user');
const Post = require('./models/post');

//templates, static files, and middleware
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.set('views', path.join(__dirname, 'views'))
app.use(express.static('css'));
app.use(express.static('script'));
app.use(express.static('image'));
app.use(methodOverride('_method'))
app.set('view engine', 'ejs')
//cookies and seesionStorage


//MongoDB connect
const dburl = process.env.DB
//const dburl = 'mongodb://localhost:27017/movieApp'
mongoose.connect(dburl, {
    useUnifiedTopology: true,
    useNewUrlParser: true
})
    .then(() => {
        console.log('Mongo Connected')
    })
    .catch(err => {
        console.log('Error with MongoDB')
        console.log(err)
    })

const secret = process.env.SECRET;
const store = MongoDBStore.create({
    mongoUrl: dburl,
    touchAfter: 24 * 60 * 60,
    secret
});

store.on('error', function (e) {
    console.log('Store Error', e)
})

const sessionConfig = {
    store,
    name: '_ses_ID',
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        //secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig));
app.use(mongoSanitize());
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//helmet and content security for cross site protection
app.use(helmet());
const connectSrcUrls = [
    "https://www.googleapis.com/",
    "https://movie-database-imdb-alternative.p.rapidapi.com/",
    "https://jikan1.p.rapidapi.com/",
    "https://books.google.com/",
    "https://m.media-amazon.com/",
    "https://cdn.myanimelist.net/"
];
const scriptSrcUrls = [];
const styleSrcUrls = [
    "https://cdnjs.cloudflare.com/"
];
const fontSrcUrls = [
    "https://cdnjs.cloudflare.com/"
];
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://books.google.com/",
                "https://m.media-amazon.com/",
                "https://cdn.myanimelist.net/"
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);

//fetch from google books api
let searchBook = (searchTerm, author) => {
    return axios.request(`https://www.googleapis.com/books/v1/volumes?q=intitle:${searchTerm}+inauthor:${author}&printType=books&key=${process.env.googleKey}`)
        .then(res => {
            return res.data.items
        }).catch(err => {
            console.log('error with searchBook');
            console.log(err);
        })
}
//fetch by id for google books
let searchBookByID = (searchTerm, id) => {
    return axios.request(`https://www.googleapis.com/books/v1/volumes?q=${id}+intitle:${searchTerm}&printType=books&key=${process.env.googleKey}`)
        .then(res => {
            return res.data.items
        }).catch(err => {
            console.log('error with searchBook');
            console.log(err);
        })
}
//fetch from myanimelist unoffical api
let searchAnimeManga = (searchTerm, mediaType) => {
    return axios.request(`https://api.jikan.moe/v4/${mediaType}/?q=${searchTerm}}`)
        .then(res => {
            return res.data.data;
        }).catch(err => {
            console.log('error with searchAnimeManga');
            console.log(err);
        })
}
//function will fetch data from movie api
let searchMovie = (searchTerm, year) => {
    return axios.request(`https://movie-database-alternative.p.rapidapi.com/?s=${searchTerm}&r=json&y=${year}&rapidapi-key=${process.env.rapidapiKey}`)
        .then(res => {
            return res.data;
        }).catch(err => {
            console.log('error with searchMovie');
            console.log(err);
        })
}
//second search to searchMovie(), used imdbID and has more info on a movie
let searchMovieByID = (id) => {
    return axios.request(`https://movie-database-alternative.p.rapidapi.com/?r=json&i=${id}&rapidapi-key=${process.env.rapidapiKey}`)
        .then(res => {
            return res.data;
        }).catch(err => {
            console.log('error with searchMovie');
            console.log(err);
        })
}

//mongoose schema routes
app.use('/', userRoutes);

//used for flash message
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

//home page
app.get('/:page?', catchAsync(async (req, res) => {
    if (req.user) {
        username = req.user.username;
    } else {
        username = 'U2ZTc5N2ZlZTczXkEyXkFqcGdeQXVyODYyMDgz';
    }
    if (req.params.page) {
        page = req.params.page;
    } else {
        page = '1';
    }
    let posts = await Post.find().sort({ date: -1 }).skip(parseInt(page) * 10 - 10).limit(10);
    const popularTitles = await Review.find().sort({ avgRating: -1 }).limit(10);
    if (posts != null || posts.length != 0) {
        res.render('search', { posts, username, popularTitles, page });
    } else {
        res.render('search', { username, popularTitles, page });
    }
}));

//render page to make general post
app.get('/submit/post', isLoggedIn, (req, res) => {
    const username = req.user.username;
    res.render('community/submit', { username });
});

//render page to make specific post
app.get('/submit/:mediaID/:title/:img/:mediaType', isLoggedIn, catchAsync(async (req, res) => {
    const { mediaID, title, img, mediaType } = req.params;
    const username = req.user.username;
    res.render('community/submitTitles', { username, mediaID, mediaType, title, img });
}))

//specific title based post for discussion saves new posts to DB
app.post('/submit/:user/:mediaID/:title/:img/:mediaType', isLoggedIn, validatePost, catchAsync(async (req, res) => {
    const { mediaID, title, img, mediaType } = req.params;
    username = req.user.username;
    const { subject, body } = req.body;
    const user = req.user;
    const newPost = new Post({
        mediaID: mediaID,
        title: title,
        img: 'https' + img.toString().substring(4),
        mediaType: mediaType,
        user: user,
        postSubject: subject,
        postBody: body,
        date: new Date()
    });
    await newPost.save();

    if (req.params.page) {
        page = req.params.page;
    } else {
        page = '1';
    }
    let posts = await Post.find().sort({ date: -1 }).skip(parseInt(page) * 10 - 10).limit(10);
    const popularTitles = await Review.find().sort({ avgRating: -1 }).limit(10);
    if (posts != null || posts.length != 0) {
        res.render('search', { posts, username, popularTitles, page });
    } else {
        res.render('search', { username, popularTitles, page });
    }
}));

//general post for discussion saves new posts to DB
app.post('/submit/:user', isLoggedIn, validatePost, catchAsync(async (req, res) => {
    username = req.user.username;
    const { subject, body } = req.body;
    const user = req.user;
    const newPost = new Post({
        user: user,
        postSubject: subject,
        postBody: body,
        date: new Date()
    });
    await newPost.save();

    if (req.params.page) {
        page = req.params.page;
    } else {
        page = '1';
    }
    let posts = await Post.find().sort({ date: -1 }).skip(parseInt(page) * 10 - 10).limit(10);
    const popularTitles = await Review.find().sort({ avgRating: -1 }).limit(10);
    if (posts != null || posts.length != 0) {
        res.render('search', { posts, username, popularTitles, page });
    } else {
        res.render('search', { username, popularTitles, page });
    }
}));

//render page to reply
app.get('/submit/:postID/reply', isLoggedIn, catchAsync(async (req, res) => {
    const username = req.user.username;
    const { postID } = req.params;
    const postByID = await Post.find({ "_id": postID });
    const post = postByID[0];
    res.render('community/reply', { post, username });
}))

//post request for replies and save new replies to DB
app.post('/submit/:postID/reply/:user', isLoggedIn, validateReply, catchAsync(async (req, res) => {
    const username = req.user.username;
    const { postID, user } = req.params;
    const { reply } = req.body;
    if (username === user) {
        let newReply = {
            user: username,
            reply: reply,
            replyDate: new Date()
        };
        replyToPost = await Post.findOneAndUpdate({ "_id": postID }, {
            $push: { "replies": newReply }
        }, { safe: true, upsert: true, new: true });
        await replyToPost.save();

        if (req.params.page) {
            page = req.params.page;
        } else {
            page = '1';
        }
        let posts = await Post.find().sort({ date: -1 }).skip(parseInt(page) * 10 - 10).limit(10);
        const popularTitles = await Review.find().sort({ avgRating: -1 }).limit(10);
        if (posts != null || posts.length != 0) {
            res.render('search', { posts, username, popularTitles, page });
        } else {
            res.render('search', { username, popularTitles, page });
        }
    } else {
        console.log('error not authorized');
    }
}))

//displays what user has reviewed
// .isauthenticated() + self(queried from navbar) runs when user is loggedin viewing his own profile
//else function runs when user is looking at another user's profile
app.get('/profile/:user', catchAsync(async (req, res) => {
    const { user } = req.params;
    if (req.isAuthenticated() && user == 'self') {
        user1 = req.user.username;
    } else {
        user1 = req.params.user;
    }
    username = user1
    let reviewed = await Reviewer.find({ user: user1 });
    const userReviews = reviewed[0];
    res.render('users/profile', { userReviews, username });
}));

//request to search movie by name(required) and year.
//mediaType, searchTerm, and Year are client side and come from <form> in navbar partial
//if functions are toggled by <form> in navbar partial
app.post('/search', saveSearchType, (req, res, next) => {
    const { searchTerm, year } = req.body;
    const { mediaType } = req.body;
    if (mediaType == 'movie') {
        searchMovie(searchTerm, year)
            .then(movies => {
                res.render('search/movie', { movies })
            }).catch(err => {
                console.log('error with app.post')
                console.log(err)
            });
    } else if (mediaType == 'book') {
        searchBook(searchTerm, year)
            .then(book => {
                if (isNaN(year) === false) res.render('asyncError', { err: { message: 'We Apologize, right now Book searches does not support Year. Please type in Authors name instead in that bar', statusCode: 404 } })
                res.render('search/book', { book })
            }).catch(err => {
                console.log('error with app.post')
                console.log(err)
            });
    } else if (mediaType == 'anime') {
        searchAnimeManga(searchTerm, mediaType)
            .then(am => {
                let AnimeManga = am
                res.render('search/anime', { AnimeManga, year })
            }).catch(err => {
                console.log('error with app.post')
                console.log(err)
            });
    } else if (mediaType == 'manga') {
        searchAnimeManga(searchTerm, mediaType)
            .then(am => {
                let AnimeManga = am
                res.render('search/manga', { AnimeManga, year })
            }).catch(err => {
                console.log('error with app.post')
                console.log(err)
            });
    } else {
        console.log('Error with mediaType selection')
        console.log(mediaType)
    }
})

//function for review rating average & to display reviews or not(prevent errors in ejs)
function reviewsMongoFunction(reviewsMongoDB) {
    if (reviewsMongoDB == null || reviewsMongoDB.length == 0) {
        averageRating = NaN;
    } else {
        averageRating = reviewsMongoDB[0].avgRating;
    };
    if (isNaN(averageRating) == true) {
        reviews = 'No Reviews Yet, Be the first to write a review for this title.';
    } else {
        reviews = reviewsMongoDB;
    }
    return [averageRating, reviews]
}

//if statement - from <form> in AnimeManga, req.session storage's come from middleware in post'/search'
//else statement - used by <a> in search.ejs, it makes a second api request using imdbID
//with 2 different api id.length is used to differ between the 2 IDs. 
app.get('/search/:id/:mediaType/:title', (req, res) => {
    const { id } = req.params;
    const { mediaType } = req.params;
    const { title } = req.params;
    req.session.mediaType = mediaType;
    if (req.user) {
        username = req.user.username;
    } else {
        username = 'U2ZTc5N2ZlZTczXkEyXkFqcGdeQXVyODYyMDgz';
    }
    if (mediaType == 'movie') {
        searchMovieByID(id)
            .then(async movie => {
                let reviewsMongoDB = await Review.find({ mediaID: id });
                let rmf = reviewsMongoFunction(reviewsMongoDB);
                const averageRating = rmf[0];
                const reviews = rmf[1];
                let movieInfo = movie;
                res.render('search/movieInfo', { movieInfo, reviews, averageRating, id, username });
            }).catch(err => {
                console.log('error with /search/:id')
                console.log(err)
            });
    } else if (mediaType == 'book') {
        searchBookByID(title, id)
            .then(async book => {
                let reviewsMongoDB = await Review.find({ mediaID: id });
                let rmf = reviewsMongoFunction(reviewsMongoDB);
                const averageRating = rmf[0];
                const reviews = rmf[1];
                res.render('search/bookInfo', { book, reviews, averageRating, id, username })
            }).catch(err => {
                console.log('error with /search/:id')
                console.log(err)
            });
    } else if (mediaType == 'anime') {
        searchAnimeManga(title, mediaType)
            .then(async am => {
                let reviewsMongoDB = await Review.find({ mediaID: id });
                let rmf = reviewsMongoFunction(reviewsMongoDB);
                const averageRating = rmf[0];
                const reviews = rmf[1];
                let AnimeManga = am
                res.render('search/animeInfo', { AnimeManga, id, reviews, averageRating, username })
            }).catch(err => {
                console.log('error with /search/:id')
                console.log(err)
            });
    } else if (mediaType == 'manga') {
        searchAnimeManga(title, mediaType)
            .then(async am => {
                let reviewsMongoDB = await Review.find({ mediaID: id });
                let rmf = reviewsMongoFunction(reviewsMongoDB);
                const averageRating = rmf[0];
                const reviews = rmf[1];
                let AnimeManga = am
                res.render('search/mangaInfo', { AnimeManga, id, reviews, averageRating, username })
            }).catch(err => {
                console.log('error with /search/:id')
                console.log(err)
            });
    }
})
//function recalulates new averageRating after any change has been made to a title
async function saveNewAvgRating(id) {
    const reviewsMongoDB = await Review.find({ mediaID: id });
    if (reviewsMongoDB == null || reviewsMongoDB[0].users.length == 0) {
        averageRating = 0;
    } else {
        let averageArray = [];
        for (let review of reviewsMongoDB[0].users) {
            averageArray.push(review.rating);
        }
        let sum = 0, i = 0;
        while (i < averageArray.length) {
            sum = sum + averageArray[i++];
        }
        averageRating = Math.round(((sum / averageArray.length) + Number.EPSILON) * 100) / 100;
    }
    await Review.findOneAndUpdate({ "mediaID": id }, {
        $set: { "avgRating": averageRating }
    });
}

//this will save all ratings to mongodb
app.post('/rate/:id/:title/:image', isLoggedIn, validateReview, catchAsync(async (req, res) => {
    const mediaType = req.session.mediaType;
    const username = req.user.username;
    const { id } = req.params;
    const { title } = req.params;
    const { image } = req.params;
    const { rating } = req.body;
    const { review } = req.body;

    let confirmReview = await Review.find({ "mediaID": id, "users.user": username });
    let confirmReviewer = await Reviewer.find({ "user": username, "reviews.mediaID": id });
    if (confirmReview == null || confirmReviewer == null || confirmReview.length + confirmReviewer.length == 0) {
        let reviewerUser = await Reviewer.find({ user: username });
        let reviewRate = await Review.find({ mediaID: id });
        let reviewingUser = {
            user: username,
            rating: rating,
            review: review,
            date: new Date()
        };

        if (image.toString().substring(0, 5) == 'https') {
            reviewerSession = {
                mediaID: id,
                title: title,
                img: image,
                mediaType: mediaType,
                rating: rating,
                review: review,
                date: new Date()
            }
        } else {
            reviewerSession = {
                mediaID: id,
                title: title,
                img: 'https' + image.toString().substring(4),
                mediaType: mediaType,
                rating: rating,
                review: review,
                date: new Date()
            }
        }

        if (reviewerUser == null || reviewerUser.length == 0) {
            reviewing = new Reviewer({
                user: username,
                reviews: [reviewerSession]
            })
        } else {
            reviewing = await Reviewer.findOneAndUpdate({ "user": username }, {
                $push: { "reviews": reviewerSession }
            }, { safe: true, upsert: true, new: true });
        };
        await reviewing.save();
        if (reviewRate == null || reviewRate.length == 0) {

            if (image.toString().substring(0, 5) == 'https') {
                reviewRating = new Review({
                    mediaID: id,
                    title: title,
                    img: image,
                    mediaType: mediaType,
                    avgRating: rating,
                    users: [reviewingUser]
                })
            } else {
                reviewRating = new Review({
                    mediaID: id,
                    title: title,
                    img: 'https' + image.toString().substring(4),
                    mediaType: mediaType,
                    avgRating: rating,
                    users: [reviewingUser]
                })
            }

        } else {
            reviewRating = await Review.findOneAndUpdate({ "mediaID": id }, {
                $push: { "users": reviewingUser }
            }, { safe: true, upsert: true, new: true });
        };
        await reviewRating.save();
        saveNewAvgRating(id);
    }

    if (mediaType == 'movie') {
        searchMovieByID(id)
            .then(async movie => {
                let reviewsMongoDB = await Review.find({ mediaID: id });
                let rmf = reviewsMongoFunction(reviewsMongoDB);
                const averageRating = rmf[0];
                const reviews = rmf[1];
                let movieInfo = movie;
                res.render('search/movieInfo', { movieInfo, reviews, averageRating, id, username });
            }).catch(err => {
                console.log('error with /search/:id')
                console.log(err)
            });
    } else if (mediaType == 'book') {
        searchBookByID(title, id)
            .then(async book => {
                let reviewsMongoDB = await Review.find({ mediaID: id });
                let rmf = reviewsMongoFunction(reviewsMongoDB);
                const averageRating = rmf[0];
                const reviews = rmf[1];
                res.render('search/bookInfo', { book, reviews, averageRating, id, username })
            }).catch(err => {
                console.log('error with /search/:id')
                console.log(err)
            });
    } else if (mediaType == 'anime') {
        searchAnimeManga(title, mediaType)
            .then(async am => {
                let reviewsMongoDB = await Review.find({ mediaID: id });
                let rmf = reviewsMongoFunction(reviewsMongoDB);
                const averageRating = rmf[0];
                const reviews = rmf[1];
                let AnimeManga = am
                res.render('search/animeInfo', { AnimeManga, id, reviews, averageRating, username })
            }).catch(err => {
                console.log('error with /search/:id')
                console.log(err)
            });
    } else if (mediaType == 'manga') {
        searchAnimeManga(title, mediaType)
            .then(async am => {
                let reviewsMongoDB = await Review.find({ mediaID: id });
                let rmf = reviewsMongoFunction(reviewsMongoDB);
                const averageRating = rmf[0];
                const reviews = rmf[1];
                let AnimeManga = am
                res.render('search/mangaInfo', { AnimeManga, id, reviews, averageRating, username })
            }).catch(err => {
                console.log('error with /search/:id')
                console.log(err)
            });
    }
}))


//to be implemented into title pages, ONLY accessible from profile page of user
//update existing reviews // from both title page and profile page
app.post('/edit/:id/:title/:image/:mediaType?', isLoggedIn, validateReview, catchAsync(async (req, res) => {
    if (req.params.mediaType) {
        mediaType = req.params.mediaType;
    } else {
        mediaType = req.session.mediaType;
    }
    const username = req.user.username;
    const { id } = req.params;
    const { title } = req.params;
    const { image } = req.params;
    const { rating } = req.body;
    const { review } = req.body;

    await Review.findOneAndUpdate({ mediaID: id }, { $pull: { users: { user: username } } });
    await Reviewer.findOneAndUpdate({ user: username }, { $pull: { reviews: { mediaID: id } } });
    let reviewingUser = {
        user: username,
        rating: rating,
        review: review,
        date: new Date()
    };
    let reviewerSession = {
        mediaID: id,
        title: title,
        img: image,
        mediaType: mediaType,
        rating: rating,
        review: review,
        date: new Date()
    };
    const reviewing = await Reviewer.findOneAndUpdate({ "user": username }, {
        $push: { "reviews": reviewerSession }
    });
    const reviewRating = await Review.findOneAndUpdate({ "mediaID": id }, {
        $push: { "users": reviewingUser }
    });
    await reviewing.save()
    await reviewRating.save()
    saveNewAvgRating(id);
    if (mediaType == req.params.mediaType) {
        let reviewed = await Reviewer.find({ user: username });
        const userReviews = reviewed[0];
        res.render('users/profile', { userReviews, username });
    } else if (mediaType == 'movie') {
        searchMovieByID(id)
            .then(async movie => {
                let reviewsMongoDB = await Review.find({ mediaID: id });
                let rmf = reviewsMongoFunction(reviewsMongoDB);
                const averageRating = rmf[0];
                const reviews = rmf[1];
                let movieInfo = movie;
                res.render('search/movieInfo', { movieInfo, reviews, averageRating, id, username });
            }).catch(err => {
                console.log('error with /search/:id')
                console.log(err)
            });
    } else if (mediaType == 'book') {
        searchBookByID(title, id)
            .then(async book => {
                let reviewsMongoDB = await Review.find({ mediaID: id });
                let rmf = reviewsMongoFunction(reviewsMongoDB);
                const averageRating = rmf[0];
                const reviews = rmf[1];
                res.render('search/bookInfo', { book, reviews, averageRating, id, username })
            }).catch(err => {
                console.log('error with /search/:id')
                console.log(err)
            });
    } else if (mediaType == 'anime') {
        searchAnimeManga(title, mediaType)
            .then(async am => {
                let reviewsMongoDB = await Review.find({ mediaID: id });
                let rmf = reviewsMongoFunction(reviewsMongoDB);
                const averageRating = rmf[0];
                const reviews = rmf[1];
                let AnimeManga = am
                res.render('search/animeInfo', { AnimeManga, id, reviews, averageRating, username })
            }).catch(err => {
                console.log('error with /search/:id')
                console.log(err)
            });
    } else if (mediaType == 'manga') {
        searchAnimeManga(title, mediaType)
            .then(async am => {
                let reviewsMongoDB = await Review.find({ mediaID: id });
                let rmf = reviewsMongoFunction(reviewsMongoDB);
                const averageRating = rmf[0];
                const reviews = rmf[1];
                let AnimeManga = am
                res.render('search/mangaInfo', { AnimeManga, id, reviews, averageRating, username })
            }).catch(err => {
                console.log('error with /search/:id')
                console.log(err)
            });
    }
}))

//delete reviews + auth
app.delete('/delete/:id/:title/:mediaType/:user?', isLoggedIn, catchAsync(async (req, res) => {
    const { id } = req.params;
    const { title } = req.params;
    const { mediaType } = req.params;
    const username = req.user.username;
    await Review.findOneAndUpdate({ mediaID: id }, { $pull: { users: { user: username } } });
    await Reviewer.findOneAndUpdate({ user: username }, { $pull: { reviews: { mediaID: id } } });
    saveNewAvgRating(id);
    if (req.params.user) {
        let reviewed = await Reviewer.find({ user: username });
        const userReviews = reviewed[0];
        res.render('users/profile', { userReviews, username });
    } else if (mediaType == 'movie') {
        searchMovieByID(id)
            .then(async movie => {
                let reviewsMongoDB = await Review.find({ mediaID: id });
                let rmf = reviewsMongoFunction(reviewsMongoDB);
                const averageRating = rmf[0];
                const reviews = rmf[1];
                let movieInfo = movie;
                res.render('search/movieInfo', { movieInfo, reviews, averageRating, id, username });
            }).catch(err => {
                console.log('error with /search/:id')
                console.log(err)
            });
    } else if (mediaType == 'book') {
        searchBookByID(title, id)
            .then(async book => {
                let reviewsMongoDB = await Review.find({ mediaID: id });
                let rmf = reviewsMongoFunction(reviewsMongoDB);
                const averageRating = rmf[0];
                const reviews = rmf[1];
                res.render('search/bookInfo', { book, reviews, averageRating, id, username })
            }).catch(err => {
                console.log('error with /search/:id')
                console.log(err)
            });
    } else if (mediaType == 'anime') {
        searchAnimeManga(title, mediaType)
            .then(async am => {
                let reviewsMongoDB = await Review.find({ mediaID: id });
                let rmf = reviewsMongoFunction(reviewsMongoDB);
                const averageRating = rmf[0];
                const reviews = rmf[1];
                let AnimeManga = am
                res.render('search/animeInfo', { AnimeManga, id, reviews, averageRating, username })
            }).catch(err => {
                console.log('error with /search/:id')
                console.log(err)
            });
    } else if (mediaType == 'manga') {
        searchAnimeManga(title, mediaType)
            .then(async am => {
                let reviewsMongoDB = await Review.find({ mediaID: id });
                let rmf = reviewsMongoFunction(reviewsMongoDB);
                const averageRating = rmf[0];
                const reviews = rmf[1];
                let AnimeManga = am
                res.render('search/mangaInfo', { AnimeManga, id, reviews, averageRating, username })
            }).catch(err => {
                console.log('error with /search/:id')
                console.log(err)
            });
    }
}))


app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404));
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Something Went Wrong';
    console.log(err)
    res.status(statusCode).render('asyncError', { err });
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Connected Port: ${port}`)
});


