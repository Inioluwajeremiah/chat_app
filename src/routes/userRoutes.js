import express from "express";
import {
  getAllUsers,
  getUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/userController.js";

const router = express.Router();

// register user
router.route("/auth/register").post(registerUser);

// login user
router.post("/auth/login", loginUser);

// logout user
router.post("/auth/logout", logoutUser);

// get all users
router.get("/user", getAllUsers);

// get user
router.get("/user/:id", getUser);

export default router;
