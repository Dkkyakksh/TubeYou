import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

export const videoSchema = new mongoose.Schema({
    videoFile: {
        type:String,
        required:true,
    },
    thumbnail: {
        type:String,
        required:true,
    },
    title: {
        type:String,
        required:true,
    },
    description: {
        type:String,
        required:true,
    },
    duration: {
        type: Number, //through cloudinary
        required:true,
    },
    views: {
        type:Number,
        default:0,
    },
    isPublished: {
        type: Boolean,
        default: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"user"
    }
},{
    timestamps:true
}
);

videoSchema.plugin(mongooseAggregatePaginate);