import {Document, Types, model, Schema} from 'mongoose'
import crypto from 'crypto';

export interface IBooking extends Document{
  user: Types.ObjectId; 
  restaurant: Types.ObjectId; 
  date: Date; 
  time: string; 
  guests: number;
  occasion?: string;
  specialRequests?: string;
  status: "Pending" | "Confirmed" | "Completed"  |"Cancelled";
  bookingId: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema  = new Schema<IBooking>(
  {
  user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  restaurant: { type: Types.ObjectId, required: true, ref: "Restaurant" },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  guests: { type: Number, required: true, min: 1 },
  occasion: { type: String, trim: true },
  specialRequests: { type: String, trim: true },
  status: { type: String, enum: ["Pending", "Confirmed", "Completed"], default: "Confirmed" },
  bookingId: { type: String, required: true },
  },
 {timestamps: true}

)
// Autogenerate reference code on save 
BookingSchema.pre("save", function(){
  if(!this.bookingId){
    this.bookingId = `GR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
  }
})

export const Booking = model<IBooking>('Booking', BookingSchema);

