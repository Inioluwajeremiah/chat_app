import { STATUS_CODES } from "../utils/statusCodes.js";
import { CustomError } from "./CustomError.js";

const developmentErrors = (res, error) => {
  res.status(error.statusCode).json({
    status: error.statusCode,
    message: error.message,
    stackTrace: error.stack,
    error: error,
  });
};

const castErrorHandler = (err) => {
  const msg = `Invalid value for ${err.path}: ${err.value}!`;
  return new CustomError(msg, STATUS_CODES.HTTP_400_BAD_REQUEST);
};

const duplicateKeyErrorHandler = (err) => {
  const name = err.keyValue;
  const [[key, value]] = Object.entries(name);
  const msg = `Duplicate data for ${key} : ${value}`;

  return new CustomError(msg, STATUS_CODES.HTTP_400_BAD_REQUEST);
};

const validationErrorHandler = (err) => {
  const errors = Object.values(err.errors).map((val) => val.message);
  const errorMessages = errors.join(". ");
  const msg = `Invalid input data: ${errorMessages}`;

  return new CustomError(msg, STATUS_CODES.HTTP_400_BAD_REQUEST);
};

const productionErrors = (res, error) => {
  if (error.isOperational) {
    res.status(error.statusCode).json({
      status: error.statusCode,
      message: error.message,
    });
  } else {
    res.status(STATUS_CODES.HTTP_500_INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: "Something went wrong! Please try again later.",
    });
  }
};

const globalError = (error, req, res, next) => {
  error.statusCode =
    error.statusCode || STATUS_CODES.HTTP_500_INTERNAL_SERVER_ERROR;
  error.status = error.status || "error";

  if (process.env.NODE_ENV === "dev") {
    developmentErrors(res, error);
  } else if (process.env.NODE_ENV === "prod") {
    if (error.name === "CastError") error = castErrorHandler(error);
    if (error.code === 11000) error = duplicateKeyErrorHandler(error);
    if (error.name === "ValidationError") error = validationErrorHandler(error);

    productionErrors(res, error);
  }
};

export default globalError;
