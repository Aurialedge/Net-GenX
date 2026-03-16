import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,   // AC...
  process.env.TWILIO_AUTH_TOKEN     // your Auth Token
);

async function sendOtp(phoneNumber) {
  try {
    console.log(' in the sending ',phoneNumber)
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID) // VA...
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      });

    console.log("OTP sent! Status:", verification.status);
  } catch (error) {
    console.error("Error sending OTP:", error);
  }
}

async function verifyOTP(phoneNumber, codeEnteredByUser) {
    try {
      const verification_check = await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({
          to: phoneNumber,
          code: codeEnteredByUser,
        });
  
      if (verification_check.status === "approved") {
        console.log("✅ OTP verified successfully!");
        // Mark the user as verified in your database here
        return true;
      } else {
        console.log("❌ OTP verification failed!");
        return false;
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return false;
    }
  }
  
// Example: send OTP to a verified number (trial account)
export default {sendOtp,verifyOTP}