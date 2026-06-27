const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

const auth = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return next(new AppError(401, "No token, authorization denied"));
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    next(new AppError(401, "Token is not valid"));
  }
};

module.exports = auth;