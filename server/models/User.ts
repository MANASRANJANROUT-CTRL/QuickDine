import {Types, model, Schema} from 'mongoose'

export interface Iuser extends Document{
  name: string; 
  email: string; 
  password?: string; 
  phone?: string; 
  role: "user" | "admin" | "owner";
  createdAt: Date;
  updatedAt: Date;
   _id: Types.ObjectId;
}

const UserSchema = new Schema(
  {
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true,trim: true, lowercase: true },
  password: { type: String, required: false, minlength: 6 },
  phone: { type: String, trim: true, minlength: 6},
  role: { type: String, enum: ["user", "admin", "owner"], default: "user" },
  },
 {timestamps: true}

)
// Remove pass when convert to Json 
UserSchema.set("toJSON", {
  transform: (doc , ret) => {
    delete ret.password;
    return ret;
  },
});

export const User = model<Iuser>('User', UserSchema);