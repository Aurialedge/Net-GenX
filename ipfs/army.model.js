import mongoose from "mongoose";

const ArmySchema = new mongoose.Schema({
    department: { type: String, required: true },
    officialId: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phoneNumber: { type: String },
    phone: { type: String },
    securityCode: { type: String, default: "123456" },
    role: { type: String, default: 'CERT-Army' }
}, { timestamps: true });

const Officials = mongoose.model("Officials", ArmySchema); 
export default Officials;
