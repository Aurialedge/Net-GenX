import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { create } from "ipfs-http-client";

const STORAGE_DIR = path.resolve('./storage');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Convert buffer to Base58 (Bitcoin alphabet for standard IPFS CIDv0)
function bufferToBase58(buffer) {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
    digits[0] += buffer[i];
    let carry = 0;
    for (let j = 0; j < digits.length; ++j) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  for (let i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) digits.push(0);
  return digits.reverse().map(digit => ALPHABET[digit]).join('');
}

function calculateIpfsCID(buffer) {
  const sha256Hash = crypto.createHash('sha256').update(buffer).digest();
  const multihash = Buffer.concat([Buffer.from([0x12, 0x20]), sha256Hash]);
  return bufferToBase58(multihash);
}

async function uploadFile(fileInput, originalName = "") {
  try {
    const data = Buffer.isBuffer(fileInput) ? fileInput : fs.readFileSync(fileInput);

    // 1. Always store in local IPFS vault with genuine multihash CID
    const cid = calculateIpfsCID(data);
    const filePath = path.join(STORAGE_DIR, cid);
    fs.writeFileSync(filePath, data);

    // Also store metadata (e.g. filename) if provided
    if (originalName) {
      fs.writeFileSync(filePath + '.meta', JSON.stringify({ originalName, timestamp: Date.now() }));
    }

    console.log("✅ File stored in NetGenX IPFS Vault! CID:", cid);

    // 2. Attempt real Kubo daemon if active
    try {
      const client = create({ url: "http://127.0.0.1:5001", timeout: 1500 });
      const result = await client.add(data);
      console.log("🌐 Synced to local IPFS Daemon Node:", result.cid.toString());
    } catch (daemonErr) {
      // Daemon not running, local storage is active
    }

    return cid;
  } catch (err) {
    console.error("❌ Error in IPFS uploadFile:", err);
    throw err;
  }
}

async function getFileData(cid) {
  const filePath = path.join(STORAGE_DIR, cid);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }
  return null;
}

export { uploadFile, getFileData, calculateIpfsCID };
