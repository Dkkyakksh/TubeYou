import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";


    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });

const uploadOnCloudinary = async(localFilePath)=>{
    try{
        if(!localFilePath) return null; 
        //upload the file on cloudinary
        const response =await cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto"
        })
        //file has been uploaded successfully
        // console.log("file is uploaded on cloudinary", response);
        fs.unlinkSync(localFilePath);
        return response;
    }catch(err){
        fs.unlinkSync(localFilePath); //removes the locally saved temp file as the upload operation got failed
        return null;
    }
} 


const extractPublicId = (url)=>{
    const segments = new URL(url).pathname.split('/'); //Extracts the path part of the URL (everything after the domain and before the query string or hash).
    // for example: http://res.cloudinary.com/dz8skv6oj/image/upload/v1735048123/gfrpurmwxmjm3ldgdieo.jpg
    // .pathname for this will return
    // /dz8skv6oj/image/upload/v1735048123/gfrpurmwxmjm3ldgdieo.jpg
    // and split will divide this into multiple elements using '/'
    // ['/dz8skv6oj', 'image', 'upload', 'v1735048123', 'gfrpurmwxmjm3ldgdieo.jpg']
    const lastSegment = segments.pop(); // gives last element from the array
    return lastSegment.split('.')[0];
}
const deleteFromCloudinary = async(cloudinaryURL)=>{
    try{
        if(!cloudinaryURL) return null;
        const publicId = extractPublicId(cloudinaryURL);

        const response = await cloudinary.api.delete_resources([publicId], { invalidate: true });
        return response;

    }catch(err){
        console.error("Error deleting resource from Cloudinary:", err.message);
        throw new ApiError(500, "Error deleting resource from Cloudinary");
    }
}

export {uploadOnCloudinary, deleteFromCloudinary};