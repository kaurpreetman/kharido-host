import mongoose from 'mongoose';

export const connectDB= async () =>{
    try{
        const conn=await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected");
    }
    catch(error){
        console.log("Error to mongoDB connection",error.message);
        process.exit(1);
    }
};

// preetkaurpawar8
//BLiO3pQ80Hi1DWJG