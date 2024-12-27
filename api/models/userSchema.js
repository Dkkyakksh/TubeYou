import mongoose from "mongoose";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase: true,
        trim:true, //reomves whitespace
        index:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase: true,
        trim:true, //reomves whitespace
    },
    fullName:{
        type:String,
        required:true,
        trim:true, //removes whitespace
        index:true
    },
    avatar:{
        type:String, //cloudinary url
        required:true,
    },
    coverImage:{
        type:String, //cloudinary url
    },
    watchHistory:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:"video"
        }
    ],
    password:{
        type:String,
        required:[true, "Password is required"],
    },
    refreshToken:{
        type:String,
    }
},
{
    timestamps:true
}

);

//this is a feature of mongodb, that we can call middleware functions during different states of the data being processed. Here we are using pre, but we could have also used post or some other state.
// here we want it to has our password before it gets uploaded to the collection
// the save here is another specification of when do we want this middleware to run. so it means pre save
//here we didn't write an arrow function because arrow functions don't support 'this' feature i.e. it doesn't know the context
//middleware should always call next
userSchema.pre("save", async function(next){
    //only when password is modified, does this middleware run
    if(!this.isModified("password")) return next();

    const salt = await bcrypt.genSalt(Number(process.env.SALT));
    const hash = await bcrypt.hash(this.password, salt);
    this.password = hash;
    next();
});

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

//this process doesn't consume much time therefore it isn't necessary to use async here
userSchema.methods.generateAccessToken = function(){
    return jwt.sign({
        _id:this._id,
        email:this.email,
        username:this.username,
        fullName:this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
        _id:this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
    )
}