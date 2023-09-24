exports.helper = (err, fn) => {
  if (!err.statusCode) {
    err.statusCode = 500;
  }

  fn(err);
};
