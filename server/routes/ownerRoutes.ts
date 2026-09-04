import { Router } from "express";
import { createOwnerRestaurant, getOwnerBookings, getOwnerRestaurant, updateBookingStatus, updateOwnerRestaurant } from "../controllers/ownerController.js";
import upload from "../config/multer.js";
import { ownerOnly, protect } from "../middlewares/auth.js";


const ownerRouter = Router();

ownerRouter.use(protect)
ownerRouter.use(ownerOnly)


ownerRouter.get("/restaurant", getOwnerRestaurant)
ownerRouter.post("/restaurant",upload.single("image"), createOwnerRestaurant)
ownerRouter.post("/restaurant",upload.single("image"), updateOwnerRestaurant)
ownerRouter.post("/bookings", getOwnerBookings)
ownerRouter.post("/bookings/:id/status", updateBookingStatus)

export default ownerRouter;