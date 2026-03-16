import mongoose from "mongoose";

const ArmySchema = new mongoose.Schema({
    department : String,
    officialId:String,
    password:String,
    phoneNumber:String,
    role:{type: String,enum:['Admin','officer','Analyst']}
});
const Officials = mongoose.model("Officials",ArmySchema); 
export default Officials
