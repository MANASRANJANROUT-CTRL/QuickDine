import {NextFunction, Request, Response} from "express";
import {Iuser, User} from "../models/User.js";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request{
  user?: Iuser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token;

  if(req.headers.authorization && req.headers.authorization.startsWith("Bearer")){
    try {

      //Get token from Bearer 
      token = req.headers.authorization.split(" ")[1];

      //verify token 
      const decoded = jwt.verify(token, process.env.JWT_SECRET !) as {id: string};

      //Get user from the token
      const user = await User.findById(decoded.id).select("-password");
      if(!user){
        res.status(401).json({message: "Not authorized, user not found"});
        return;
      }
req.user = user;
next();
}catch (error){
  console.error("Auth Middleware Error:", error);
  res.status(401).json({message: "Not authorized, token failed"});
}
  }

  if(!token){
    res.status(401).json({message: "Not authorized, no token"});
  }
}

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Access Denied, admin role required" });
  }
}

export const ownerOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === "owner") {
    next();
  } else {
    res.status(403).json({ message: "Access Denied, restaurant owner role required" });
  }
}

