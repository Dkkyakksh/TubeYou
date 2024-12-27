import mongoose from "mongoose";

export const subscriptionSchema = new mongoose.Schema({
    subscriber:{
        type: mongoose.Schema.Types.ObjectId, //one who is subscribing
        ref:"user"
    },
    channel:{
        type: mongoose.Schema.Types.ObjectId, // one who is being subscribed to
        ref:"user"
    }
},{timestamps: true})