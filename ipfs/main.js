// main.js
import { create } from "ipfs-http-client";

// Connect to local IPFS node
const client = create({ url: "http://127.0.0.1:5001" });

async function uploadFile(fileInput) {
  try {
    // fileInput can be a Buffer (from multer) or a string path
    const data = Buffer.isBuffer(fileInput) ? fileInput : fs.readFileSync(fileInput);
    const result = await client.add(data);
    console.log("✅ File uploaded!");
    console.log("CID:", result.cid.toString());
    console.log("Gateway URL: https://ipfs.io/ipfs/" + result.cid.toString());
    return result.cid.toString();
  } catch (err) {
    console.error("❌ Error uploading file:", err);
    throw err;
  }
}

export { uploadFile };
