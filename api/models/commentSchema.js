import mongoose from "mongoose";

export const commentSchema = mongoose.Schema({
    videoId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"video",
        required:true,
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user",
        required:true
    },
    CommentText:{
        type:String,
        required:true,
    },
    timestamp:{
        type:Date,
        default: Date.now,
    }
});