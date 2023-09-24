const { validationResult, Result } = require("express-validator");
const USER = require("../models/user");
const jwt = require("jsonwebtoken");

const bcrypt = require("bcryptjs");
const { helper } = require("../helper/helper");

exports.signup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation errors");
    error.statusCode = 422;
    error.data = errors.array();

    throw error;
  }
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;

  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new USER({ email, name, password: hashedPassword });
      return user.save();
    })
    .then((result) => {
      res.status(200).json({ message: "User created", userId: result._id });
    })
    .catch((err) => helper.helper(err, next));
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadUser;
  USER.findOne({ email: email })
    .then((user) => {
      if (!user) {
        const error = new Error("no user found with this email");
        error.statusCode = 401;
        throw error;
      }
      loadUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("You entered a wrong password");
        error.statusCode = 401;
        throw error;
      }

      const token = jwt.sign(
        {
          email: loadUser.email,
          userId: loadUser._id.toString(),
        },
        "secret",
        { expiresIn: "1h" }
      );

      res.status(200).json({ token, userId: loadUser._id.toString() });
    })
    .catch((err) => helper.helper(err, next));
};
