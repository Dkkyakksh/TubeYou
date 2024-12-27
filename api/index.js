import express from 'express';
import {db} from './db.js';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import authRoutes from './routes/auth.js';
import cors from 'cors'

const app = express();
app.use(cors())
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended:true})) //urlencoded means to encode the data being obtained through url commonly data by forms
//extended means the objects being passes can have their own objects
app.use(express.static("public"))


app.use("/api/v1/auth", authRoutes);



app.listen(process.env.PORT, ()=>{
    console.log("Connected!")
})