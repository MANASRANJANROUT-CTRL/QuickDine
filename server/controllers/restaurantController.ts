import {Request, Response} from 'express';
import { IRestaurant, Restaurant } from '../models/Restaurant.js';
import { AuthRequest } from '../middlewares/auth.js';
import jwt from 'jsonwebtoken'; 
import { User } from '../models/User.js';
import { Booking } from '../models/Booking.js';

// Get all restaurants with search and filters 
//Get /api/restaurant
export const getRestaurants = async (req: Request, res: Response): Promise<void> => {

  try {
    const {search, location, priceRange, rating, sort, cuisine} = req.query;

    //Build Query Object
    const queryObj: any = {status: "Approved"};

    if(search){
      queryObj.$or = [
        {name: {$regex: search, $options: "i"}},
        {location: {$regex: search, $options: "i"}},
        {tags: {$regex: search, $options: "i"}}
      ]
    }

    if(priceRange){
      const Prices = Array.isArray(priceRange) ? priceRange : [priceRange];
      queryObj.priceRange = {$in: Prices};
    }

    if(cuisine){
      const Cuisines = Array.isArray(cuisine) ? cuisine : [cuisine];
      queryObj.cuisine = {$in: Cuisines};
    }

    if(rating){
      queryObj.rating = {$gte: parseFloat(rating as string)};
    }

   if(location){
      queryObj.location = {$regex: location, $options: "i"};
    }

    // Sorting 
    let sortOption: any = {createdAt: -1}; // Default sort by newest
    if (sort === "rating") {
      sortOption = {rating: -1};
    } else if (sort === "price_low") {
      sortOption = {priceRange: 1};
    } else if (sort === "price_high") {
      sortOption = {priceRange: -1};
    }
 
    const restaurant = await Restaurant.find(queryObj).sort(sortOption);
    res.json(restaurant);

  } catch (error: any) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
}

// Get all Featured and Exclusive restaurants with search and filters 
//Get /api/restaurant/featured
export const getFeaturedRestaurants = async (req: Request, res: Response): Promise<void> => {

  try {
    const featured = await Restaurant.find({featured: true, status: "Approved", 
      $or: [{featured:true}, {exclusive: true}]
    }).limit(6)
     
    res.json(featured);

  } catch (error: any) {
    console.error("Get Featuired Restaurants Error:", error);
    res.status(500).json({ message: error.message });
  }
}

// Get single Restaurant by Slug 
//Get /api/restaurants/:slug
export const getRestaurantBySlug = async (req: Request, res: Response): Promise<void> => {

  try {
    const restaurant = await Restaurant.findOne({slug: req.params.slug})
    if(!restaurant){
      res.status(404).json({message: "Restaurant not found"});
      return;
    }
  

    //if not approved , verify authorizaation (owner or admin)
if (restaurant.status !== "Approved") {
  let isAuthorized = false;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };

      const user = await User.findById(decoded.id);
      if (user && (user.role === "admin" || (user.role === "owner" && restaurant.owner.toString() === user._id.toString()))) {
        isAuthorized = true;
      }
    } catch (err) {
     //ignore token verify error 
    }
  }

  if (!isAuthorized) {
    res.status(404).json({ message: "Restaurant not found or pending approval" });
    return;
  }
}
res.json(restaurant);
  }catch (error: any){
    console.error(error);
    res.status(400).json({ message: error.message });
  } 

}

// Get dynamic seat availability for slots
//Get /api/restaurants/:id/availability
export const getRestaurantAvailability = async (req: Request, res: Response): Promise<void> => {

  try {
    const {date} = req.query;
    if(!date ){
      res.status(400).json({message: "Please provide a date"});
      return;
    }

    const restaurant = await Restaurant.findById(req.params.id);
    if(!restaurant){
      res.status(404).json({message: "Restaurant not found"});
      return;
    }

    const bookingDate = new Date(date as string)

    //Get all active booking s from the restaurant for the given date
    const bookings = await Booking.find({
      restaurant: restaurant._id, 
      date: bookingDate, 
      status:"Confirmed"
    });

    //Map slots to available capacity
    const availability = restaurant.availableSlots.map((slot) => {
      const bookedSeats = bookings.filter((b)=> b.time === slot).reduce((sum, b) => sum + b.guests, 0)

      const totalSeats = restaurant.totalSeats || 20 ; 
      const availableSeats = Math.max(0, totalSeats - bookedSeats);

      return {
        time : slot,
        availableSeats,
        isAvailable: availableSeats > 0
      }
    })

    res.json( availability)

  } catch (error: any) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
}