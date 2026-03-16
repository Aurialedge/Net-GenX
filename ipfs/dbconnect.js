import mongoose from "mongoose";
const connect=(url)=>{
    try{
        mongoose.connect(url)
        console.log("Connected to MongoDB")
    }
    catch(e){
    console.log(e)
}
}
export default connect