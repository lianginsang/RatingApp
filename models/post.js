const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
    user: mongoose.Schema.Types.Mixed,
    reply: String,
    replyDate: mongoose.Schema.Types.Mixed
});

const postSchema = new mongoose.Schema({
    mediaID: mongoose.Schema.Types.Mixed,
    title: mongoose.Schema.Types.Mixed,
    img: mongoose.Schema.Types.Mixed,
    mediaType: String,
    user: mongoose.Schema.Types.Mixed,
    postSubject: String,
    postBody: String,
    date: mongoose.Schema.Types.Mixed,
    replies: [replySchema]
});

const Post = mongoose.model('Post', postSchema)
module.exports = Post;