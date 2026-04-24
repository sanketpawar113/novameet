import { Router } from "express";
import {
    login,
    register,
    getUserHistory,
    addToHistory,
    deleteHistoryItem,
    clearAllHistory
} from "../controllers/user.controller.js";

const router = Router();

router.route("/login").post(login);
router.route("/register").post(register);
router.route("/add_to_activity").post(addToHistory);
router.route("/get_all_activity").get(getUserHistory);

// Host-only delete routes
router.route("/delete_activity").delete(deleteHistoryItem);
router.route("/clear_all_activity").delete(clearAllHistory);

export default router;