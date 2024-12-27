import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import {db,userModel} from '../db.js'
import { ApiError } from '../utils/ApiError.js'
import {asyncHandler} from '../utils/asyncHandler.js';
import { deleteFromCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/Apiresponse.js';
import mongoose from 'mongoose';

const generateAccessAndRefreshTokens = async (userId)=>{
    try{
        const user = await userModel.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave:false })

        return {accessToken, refreshToken}

    }catch(err){
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens")
    }
}


export const registerUser = asyncHandler( async(req,res)=>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    const {fullName, email, username, password} = req.body;
    // console.log(req.body);
    // console.log(req.files);
    // console.log(req);
    if(
        [fullName, email, username, password].some((field)=> field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await userModel.findOne({
        $or:[{ username },{ email }]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    //time for files
    const avatarLocalPath=req.files?.avatar[0]?.path;
    // const coverImageLocalPath=req.files?.coverImage?.path || null;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await userModel.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await userModel.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

export const loginUser = asyncHandler(async(req,res)=>{
    //in userSchema methods are already written for generating access and refresh tokens
    //in userSchema method is written to check password
    //email/username check
    //check if this user exists
    //match password using bcrypt comparesync
    //generate token- access and refresh 
    // send cookie
    
    const {email, username, password} = req.body;

    if(!username && !email){
        throw new ApiError(400, "username or email is required")
    }

    const user = await userModel.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User does not exist")
    }
    
    // the variable made is used her because methods are saved with it
    //the model does not include the methods
    const isPasswordValid = await user.isPasswordCorrect(password)
    
    if(!isPasswordValid){
        throw new ApiError(404, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await userModel.findById(user._id).select(" -password -refreshToken")

    const options={ //now cookies are modifiable only through server and not through front end
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, 
                accessToken, 
                refreshToken
            },
            "User logged in successfully"
        )
    )
})

export const logoutUser = asyncHandler(async(req,res)=>{
    await userModel.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new:true //return response contains new updated values rather than the old ones
        }
    )
    const options={ //now cookies are modifiable only through server and not through front end
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User has been logged out"))
})

export const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await userModel.findById({_id:decodedToken?._id})
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }
        
        if(incomingRefreshToken !== user.refreshToken){
            throw new ApiError(401, "Refresh Token is expired or used")   
        }

        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id);

        const options={
            httpOnly:true,
            secure: true,
        }

        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json( 
            new ApiResponse(
                200,
                {accessToken, refreshToken:newRefreshToken},
                "Access token refreshed"
            )
        )

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }
})

export const changeCurrentPassword = asyncHandler(async (req,res)=>{
    const {oldPassword, newPassword} = req.body;

    const user = await userModel.findById(req.user?._id)
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordValid){
        throw new ApiError(400, "Invalid Password")
    }

    user.password= newPassword;
    user.save({ validateBeforeSave: false})

})

export const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

export const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName, email} = req.body;

    if(!fullName && !email){
        throw new ApiError(400, "At least one field is required")
    }

    const user = await userModel.findByIdAndUpdate(req.user?._id, 
        {
            $set:{
                fullName,
                email:email
            }
        },
        {
            new:true
        }
    ).select("-password -refreshToken") 

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        "Account details updated successfully"
    ))
})

export const updateUserAvatar = asyncHandler(async (req,res)=>{
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar File is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading avatar")
    }

    const oldAvatarURL = req.user.avatar;
    try {
        await deleteFromCloudinary(oldAvatarURL);
    } catch (error) {
        throw new ApiError(500, "Error deleting old Avatar from cloudinary")
    }

    const user = await userModel.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        }
        ,
        {
            new:true
        }
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        "Avatar updated successfully"
    ))
})

export const updateUserCoverImage = asyncHandler(async (req,res)=>{
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image File is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading cover image")
    }

    const oldCoverImageURL = req.user.coverImage;
    try {
        await deleteFromCloudinary(oldCoverImageURL);
    } catch (error) {
        throw new ApiError(500, error?.message || "Error deleting old cover image from cloudinary")
    }

    const user = await userModel.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        }
        ,
        {
            new:true
        }
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        "Cover image updated successfully"
    ))
})

export const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username}= req.params;

    if(!username?.trim()){
        throw new ApiError(400, "Username is missing")
    }

    const channel = await userModel.aggregate([
        {
            //match fields
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",  
                //model name is subscription but here we want multiple subscription documents. In this case the model name becomes lowercas (this doesn't affect ours, as it was already lowercase) and it gets added an 's'
                localField:"_id",
                foreignField:"channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers" //since this is a field now, therefore we have to use $
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])
//     Model.aggregate() returns a Mongoose Aggregate object, which can be used to chain additional pipeline stages or execute the query.
// Use .exec() or await the aggregate() call to get the actual results of the aggregation.

//returns an array of objects

    if(!channel?.length){
        throw new ApiError(404, "Channel doesn't exist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "User channel fetched successfully"))
})

export const getWatchHistory= asyncHandler(async(req,res)=>{
    const user = await userModel.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
// In MongoDB, the _id field is typically stored as an ObjectId in the format ObjectId('...'). When working with Mongoose, it abstracts this by presenting the _id as a plain string, simplifying its usage in your application.

// However, when using Mongoose's aggregation functions, the pipeline is sent directly to MongoDB for execution, bypassing Mongoose's abstraction layer. In such cases, if you need to reference an _id field, it must be in the native ObjectId format that MongoDB expects.

// To generate this format in your code, you can use new mongoose.Types.ObjectId(id), which creates a valid MongoDB ObjectId from the given string id. This ensures compatibility when working with aggregation pipelines or other MongoDB-specific operations.
            }
        },
        {
            $lookup:{
                from: "videos",
                localField:"watchHistory",
                foreignField:"_id",
                as: "watchHistory"   ,
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    //since aggregate functions return an array, here we'll write a pipeline to structure the data
                    //here we are recieving the owner's data and owner of a video can only be one guy, therefore the array will always have one value
                    //we'll return the data in such a way that this owner is the only object being returned and not an array
                    {
                        $addFields:{
                            //overwriting our owner field
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch History fetched successully"
        )
    )
})