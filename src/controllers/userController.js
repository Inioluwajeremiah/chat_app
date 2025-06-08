import bcrypt from "bcryptjs";
import createToken from "../utils/createToken.js";
import { CustomError } from "../middlewares/CustomError.js";
import tryCatchAsyncMiddleWare from "../middlewares/tryCatchAsyncMiddleWare.js";
import User from "../models/User.js";
import { STATUS_CODES } from "../utils/statusCodes.js";

/* register user */
const registerUser = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const { username, password } = req.body;
  const lower_username = username.toLowerCase().trim();
  console.log("data received =>", username);

  //   check if user exists
  const user = await User.findOne({ username: lower_username });
  if (user) {
    const error = new CustomError(
      "User already exists.",
      STATUS_CODES.HTTP_400_BAD_REQUEST
    );
    next(error);
  }

  //   hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  console.log(`${password}:${hashedPassword}`.green);

  //   create user
  const createUser = await User.create({
    username: lower_username,
    password: hashedPassword,
  });

  if (createUser) {
    res.status(STATUS_CODES.HTTP_201_CREATED).json({
      message: "Signup successful!",
    });
  } else {
    const error = new CustomError(
      "User data not valid.",
      STATUS_CODES.HTTP_400_BAD_REQUEST
    );
    next(error);
  }
});

/************ LOGIN USER  **********/
const loginUser = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const { username, password } = req.body;
  const lower_username = username.toLowerCase().trim();
  const user = await User.findOne({ username: lower_username });

  if (user && (await bcrypt.compare(password, user.password))) {
    // generate token
    createToken(res, user._id);

    res.status(STATUS_CODES.HTTP_200_OK).json({
      message: "Login successful!",
      _id: user._id,
      username: user.username,
    });
  } else {
    const error = new CustomError(
      "Invalid username or password.",
      STATUS_CODES.HTTP_400_BAD_REQUEST
    );
    next(error);
  }
});

/************ LOGOUT USER  **********/
// logout user and clear stored jwt in cookies

const logoutUser = tryCatchAsyncMiddleWare(async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res
    .status(STATUS_CODES.HTTP_200_OK)
    .json({ message: "Logged out successfuly!" });
});

/************ GET USER **********/

const getUser = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const user = await User.findById({ _id: req.params.id }).select("-password");

  if (!user) {
    const error = new CustomError(
      "User not found",
      STATUS_CODES.HTTP_404_NOT_FOUND
    );
    return next(error);
  }
  if (user) {
    res
      .status(STATUS_CODES.HTTP_200_OK)
      .json({ status: "success", message: "Get user successful", data: user });
  }
});

const getAllUsers = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const users = await User.find({}).select("-password");

  if (!users) {
    const error = new CustomError(
      "Users not found",
      STATUS_CODES.HTTP_404_NOT_FOUND
    );
    return next(error);
  }
  if (users) {
    res
      .status(STATUS_CODES.HTTP_200_OK)
      .json({ status: "success", message: "Get user successful", data: users });
  }
});

export { registerUser, loginUser, logoutUser, getUser, getAllUsers };
