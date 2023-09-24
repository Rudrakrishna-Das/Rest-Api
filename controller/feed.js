const { validationResult } = require("express-validator");

const fs = require("fs");
const path = require("path");

const POST = require("../models/post");
const USER = require("../models/user");

const helper = require("../helper/helper");
const { count } = require("console");

exports.getFeed = (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;
  POST.find()
    .countDocuments()
    .then((count) => {
      totalItems = count;
      return POST.find()
        .skip((currentPage - 1) * perPage)
        .limit(perPage);
    })
    .then((posts) => {
      if (!posts) {
        const error = new Error("Could not found any post");
        error.status = 404;

        throw error;
      }
      res.status(200).json({
        message: "got posts",
        posts,
        totalItems,
      });
    })

    .catch((err) => helper.helper(err, next));
};

exports.getContent = (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    const error = new Error("Validation Error");
    error.status = 422;
    throw error;
  }

  if (!req.file) {
    const error = new Error("No image provided");
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title; //bodyParser.json() adding this when we getting the data
  const content = req.body.content;
  const imageUrl = req.file.path.replace("\\", "/");
  let creator;

  const post = new POST({
    title,
    imageUrl: imageUrl,
    content,
    creator: req.userId,
  });
  post
    .save()
    .then((result) => {
      return USER.findById(req.userId)
        .then((user) => {
          creator = user;
          user.posts.push(post);
          return user.save();
        })
        .then((result) => {
          res.status(201).json({
            message: "post added",
            post: post,
            creator: { _id: creator._id, name: creator.name },
          });
        });
    })
    .catch((err) => {
      helper.helper(err, next);
    });
};

exports.getSinglePost = (req, res, next) => {
  const postId = req.params.postId;

  POST.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not found any post");
        error.status = 404;

        throw error;
      }
      res.status(200).json({ message: "post found", post });
    })
    .catch((err) => helper.helper(err, next));
};

exports.updatePost = (req, res, next) => {
  const postId = req.params.postId;

  const error = validationResult(req);
  if (!error.isEmpty()) {
    const error = new Error("Validation Error");
    error.status = 422;
    throw error;
  }

  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;

  if (req.file) {
    imageUrl = req.file.path.replace("\\", "/");
  }
  if (!imageUrl) {
    const error = new Error("No file picked.");
    error.statusCode = 422;
    throw error;
  }

  POST.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not found any post");
        error.status = 404;
        throw error;
      }

      if (post.creator.toString() !== req.userId) {
        let error = new Error("Not Authorized");
        error.statusCode = 403;
        throw error;
      }

      if (imageUrl !== post.imageUrl) {
        clearImage(post.imageUrl);
      }

      post.title = title;
      post.content = content;
      post.imageUrl = imageUrl;

      return post.save();
    })
    .then((result) => {
      res.status(200).json({ message: "post Updated", post: result });
    })
    .catch((err) => helper.helper(err, next));
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  POST.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not found any post");
        error.status = 404;
        throw error;
      }

      if (post.creator.toString() !== req.userId) {
        let error = new Error("Not Authorized");
        error.statusCode = 403;
        throw error;
      }

      clearImage(post.imageUrl);
      return POST.findByIdAndRemove(postId);
    })
    .then((result) => {
      return USER.findById(req.userId);
    })
    .then((user) => {
      user.posts.pull(postId);
      return user.save();
    })
    .then((result) => {
      res.status(200).json({ message: "Post Deleted" });
    })
    .catch((err) => helper.helper(err, next));
};

const clearImage = (filePath) => {
  fs.unlink(filePath, (err) => console.log(err));
};

exports.getStatus = (req, res, next) => {
  const userId = req.userId;

  USER.findById(userId)
    .then((user) => {
      res.status(200).json({ status: user.status });
    })
    .catch((err) => helper.helper(err, next));
};

exports.updateStatus = (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    const error = new Error("Validation Error");
    error.status = 422;
    throw error;
  }
  const status = req.body.status;

  USER.findById(req.userId)
    .then((user) => {
      user.status = status;
      return user.save();
    })
    .then((result) => {
      res.status(200).json({ message: "Status Updated!" });
    })
    .catch((err) => helper.helper(err, next));
};
