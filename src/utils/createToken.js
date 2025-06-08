import jwt from "jsonwebtoken";

const createToken = (res, id) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  // set jwt as http-only cookie
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.node_env !== "dev",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60,
  });
};

export default createToken;
