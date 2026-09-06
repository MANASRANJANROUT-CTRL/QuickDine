import { AuthRequest } from "../middlewares/auth.js";
import { Response } from "express";
import { Restaurant } from "../models/Restaurant.js";
import cloudinary from "../config/cloudinary.js";
import { Booking } from "../models/Booking.js";

// Helper function: upload buffer to Cloudinary
const uploadToCloudinary = (
  fileBuffer: Buffer
): Promise<{ secure_url: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "QuickDine" },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(error);
        }

        if (!result) {
          return reject(new Error("Upload failed"));
        }

        resolve({
          secure_url: result.secure_url,
        });
      }
    );

    stream.end(fileBuffer);
  });
};

// Get owner's restaurant
// GET /api/owner/restaurant
export const getOwnerRestaurant = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurants = await Restaurant.find({
      owner: req.user?._id,
    });

    if (!restaurants.length) {
      res.status(200).json(null);
      return;
    }

    // Find a restaurant belonging to this owner that has bookings
    let selectedRestaurant = null;

    for (const restaurant of restaurants) {
      const bookingExists = await Booking.exists({
        restaurant: restaurant._id,
      });

      if (bookingExists) {
        selectedRestaurant = restaurant;
        break;
      }
    }

    // If no restaurant has bookings, use the first approved restaurant
    if (!selectedRestaurant) {
      selectedRestaurant =
        restaurants.find((r) => r.status === "Approved") ||
        restaurants[0];
    }

    res.status(200).json(selectedRestaurant);
  } catch (error: any) {
    console.error("Get owner restaurant error:", error);

    res.status(500).json({
      message: error.message || "Failed to fetch owner restaurant",
    });
  }
};

// =====================================================
// Create owner's restaurant
// POST /api/owner/restaurant
// =====================================================
export const createOwnerRestaurant = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check if owner already has a restaurant
    const existing = await Restaurant.findOne({
      owner: req.user?._id,
    });

    if (existing) {
      res.status(400).json({
        message: "You already have a restaurant registered",
      });
      return;
    }

    const {
      name,
      description,
      cuisine,
      priceRange,
      location,
      address,
      chef,
      tags,
      availableSlots,
      totalSeats,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !description ||
      !cuisine ||
      !priceRange ||
      !location ||
      !address ||
      !chef
    ) {
      res.status(400).json({
        message: "Please provide all required fields",
      });
      return;
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    // Check slug uniqueness
    const slugExists = await Restaurant.findOne({ slug });

    if (slugExists) {
      res.status(400).json({
        message: "A restaurant with this name already exists",
      });
      return;
    }

    // Handle image
    let imageUrl = "";

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
    }

    // Parse tags
    const parsedTags =
      typeof tags === "string"
        ? tags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean)
        : tags || [];

    // Parse available slots
    const parsedSlots =
      typeof availableSlots === "string"
        ? availableSlots
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : availableSlots || [
            "17:00",
            "18:00",
            "19:00",
            "20:00",
            "21:00",
          ];

    // Create restaurant
    const restaurant = await Restaurant.create({
      name,
      slug,
      description,
      cuisine,
      priceRange,
      location,
      address,
      chef,
      image: imageUrl,
      tags: parsedTags,
      availableSlots: parsedSlots,
      totalSeats: totalSeats ? Number(totalSeats) : 20,
      owner: req.user?._id,
      status: "Pending",
    });

    res.status(201).json(restaurant);
  } catch (error: any) {
    console.error("Create owner restaurant error:", error);

    res.status(400).json({
      message: error.message || "Failed to create restaurant",
    });
  }
};

// =====================================================
// Update owner's restaurant
// PUT /api/owner/restaurant
// =====================================================
export const updateOwnerRestaurant = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurant = await Restaurant.findOne({
      owner: req.user?._id,
    });

    if (!restaurant) {
      res.status(404).json({
        message: "Restaurant profile not found",
      });
      return;
    }

    const {
      name,
      description,
      cuisine,
      priceRange,
      location,
      address,
      chef,
      tags,
      availableSlots,
      totalSeats,
    } = req.body;

    if (name) restaurant.name = name;
    if (description) restaurant.description = description;
    if (cuisine) restaurant.cuisine = cuisine;
    if (priceRange) restaurant.priceRange = priceRange;
    if (location) restaurant.location = location;
    if (address) restaurant.address = address;
    if (chef) restaurant.chef = chef;

    if (totalSeats) {
      restaurant.totalSeats = Number(totalSeats);
    }

    // Update tags
    if (tags) {
      restaurant.tags =
        typeof tags === "string"
          ? tags
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean)
          : tags;
    }

    // Update available slots
    if (availableSlots) {
      restaurant.availableSlots =
        typeof availableSlots === "string"
          ? availableSlots
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : availableSlots;
    }

    // Handle new image
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      restaurant.image = result.secure_url;
    }

    const updated = await restaurant.save();

    res.status(200).json(updated);
  } catch (error: any) {
    console.error("Update owner restaurant error:", error);

    res.status(400).json({
      message: error.message || "Failed to update restaurant",
    });
  }
};

// Get bookings for all restaurants owned by the owner
// GET /api/owner/bookings
export const getOwnerBookings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Get ALL restaurants belonging to this owner
    const restaurants = await Restaurant.find({
      owner: req.user?._id,
    });

    if (!restaurants.length) {
      res.status(404).json({
        message: "Restaurant profile not found",
      });
      return;
    }

    // Get all restaurant IDs owned by this owner
    const restaurantIds = restaurants.map(
      (restaurant) => restaurant._id
    );

    console.log("OWNER RESTAURANTS:", restaurants.map((r) => ({
      id: r._id,
      name: r.name,
      status: r.status,
    })));

    console.log("OWNER RESTAURANT IDS:", restaurantIds);

    // Get bookings belonging to ANY restaurant owned by this owner
    const bookings = await Booking.find({
      restaurant: { $in: restaurantIds },
    })
      .populate("restaurant", "name location image")
      .populate("user", "name email phone")
      .sort({
        date: -1,
        time: -1,
      });

    console.log("OWNER BOOKINGS FOUND:", bookings.length);

    res.status(200).json(bookings);
  } catch (error: any) {
    console.error("Get owner bookings error:", error);

    res.status(500).json({
      message: error.message || "Failed to fetch owner bookings",
    });
  }
};
// =====================================================
// Update booking status
// PUT /api/owner/bookings/:id/status
// =====================================================
export const updateBookingStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status } = req.body;

    // Validate status
    if (
      !status ||
      !["Confirmed", "Cancelled", "Completed"].includes(status)
    ) {
      res.status(400).json({
        message: "Please enter a valid booking status",
      });
      return;
    }

    // Find booking
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      res.status(404).json({
        message: "Booking not found",
      });
      return;
    }

    // Find restaurant belonging to booking
    const restaurant = await Restaurant.findById(booking.restaurant);

    if (!restaurant) {
      res.status(404).json({
        message: "Restaurant not found",
      });
      return;
    }

    // Verify ownership
    if (
      restaurant.owner.toString() !== req.user?._id.toString()
    ) {
      res.status(401).json({
        message: "Not authorized to manage this booking",
      });
      return;
    }

    // Update status
    booking.status = status;

    await booking.save();

    res.status(200).json(booking);
  } catch (error: any) {
    console.error("Update booking status error:", error);

    res.status(400).json({
      message: error.message || "Failed to update booking status",
    });
  }
};