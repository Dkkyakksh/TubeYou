import mongoose from "mongoose";
const dbURI = "mongodb://127.0.0.1:27017/TubeYou";
const db = mongoose.connect(dbURI).then(()=>console.log("MongoDB Connected!")).catch(err=>console.log(err));
import { userSchema } from "./models/userSchema.js";
import { videoSchema } from "./models/videoSchema.js";
import { commentSchema } from "./models/commentSchema.js";
import { subscriptionSchema } from "./models/subscriptionSchema.js";


const userModel = mongoose.model("user", userSchema);

const videoModel = mongoose.model("video", videoSchema);

const commentModel = mongoose.model("comment", commentSchema);

const subscriptionModel = mongoose.model("subscription", subscriptionSchema);

export {db, userModel, videoModel, commentModel, subscriptionModel};