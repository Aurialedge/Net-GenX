import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { create } from "ipfs-http-client";

const STORAGE_DIR = path.resolve('./storage');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const IPFS_API_URL = process.env.IPFS_API_URL || process.env.IPFS_NODE_URL || "http://127.0.0.1:5001";
const IPFS_GATEWAY_URL = process.env.IPFS_GATEWAY_URL || "http://127.0.0.1:8080";

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

const CID_PATTERN = /^(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,100})$/;
export function isValidCid(cid) {
  return typeof cid === 'string' && CID_PATTERN.test(cid);
}

function calculateIpfsCID(buffer) {
  const sha256Hash = crypto.createHash('sha256').update(buffer).digest();
  const multihash = Buffer.concat([Buffer.from([0x12, 0x20]), sha256Hash]);
  return bufferToBase58(multihash);
}

async function uploadFile(fileInput, originalName = "", clientName = "General_Personnel") {
  try {
    const data = Buffer.isBuffer(fileInput) ? fileInput : fs.readFileSync(fileInput);

    let finalCid = calculateIpfsCID(data);
    let pinnedToDaemon = false;

    // 1. Attempt upload & pin to Real IPFS Daemon (Kubo / IPFS Desktop / Docker)
    try {
      const client = create({ url: IPFS_API_URL, timeout: 3000 });
      const result = await client.add(data, { pin: true });
      if (result && result.cid) {
        finalCid = result.cid.toString();
        pinnedToDaemon = true;
        console.log("🌐 [IPFS DAEMON] Successfully pinned file to live IPFS Network! CID:", finalCid);

        // Mirror into IPFS Desktop Mutable File System (MFS) under /NetGenX_Evidence/<ClientName>/
        try {
          const sanitizedClient = (clientName || "General_Personnel")
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, "_")
            .replace(/_+/g, "_");
          const folder = `/NetGenX_Evidence/${sanitizedClient}`;

          // Create client directory inside NetGenX_Evidence
          await fetch(`${IPFS_API_URL}/api/v0/files/mkdir?arg=${encodeURIComponent(folder)}&parents=true`, { method: 'POST' });

          const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
          const baseName = (originalName || 'evidence.txt').replace(/[^a-zA-Z0-9._-]/g, '_');
          const fileName = `${timestamp}_${baseName}`;
          const mfsFilePath = `${folder}/${fileName}`;

          await fetch(`${IPFS_API_URL}/api/v0/files/cp?arg=/ipfs/${finalCid}&arg=${encodeURIComponent(mfsFilePath)}`, { method: 'POST' });
          console.log(`📂 [IPFS MFS] File cataloged in IPFS Desktop: ${mfsFilePath}`);
        } catch (mfsErr) {
          console.warn("Notice syncing to IPFS Desktop MFS:", mfsErr.message);
        }
      }
    } catch (daemonErr) {
      console.log(`ℹ️ [IPFS DAEMON] Live node at ${IPFS_API_URL} not active (${daemonErr.message}). Persisting in local cryptographic vault.`);
    }

    // 2. Persist in local storage vault for immediate fast retrieval & redundancy
    const filePath = path.join(STORAGE_DIR, finalCid);
    fs.writeFileSync(filePath, data);

    if (originalName) {
      fs.writeFileSync(filePath + '.meta', JSON.stringify({ 
        originalName, 
        clientName,
        timestamp: Date.now(),
        pinnedToDaemon
      }));
    }

    console.log(`✅ [NETGENX VAULT] Content hashed & stored! CID: ${finalCid}`);
    return finalCid;
  } catch (err) {
    console.error("❌ Error in IPFS uploadFile:", err);
    throw err;
  }
}

async function getFileData(cid) {
  // Only well-formed CIDs (CIDv0 base58 "Qm..." or CIDv1 base32 "b...") may touch the filesystem;
  // anything else (e.g. "../.env") is rejected so the vault cannot be used to read arbitrary files.
  if (!isValidCid(cid)) {
    return null;
  }

  // 1. Check local storage vault
  const filePath = path.join(STORAGE_DIR, cid);
  if (path.dirname(filePath) === STORAGE_DIR && fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }

  // 2. Check local IPFS Daemon gateway (port 8080)
  try {
    const res = await fetch(`${IPFS_GATEWAY_URL}/ipfs/${cid}`);
    if (res.ok) {
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
    }
  } catch (e) {}

  // 3. Check public IPFS gateway
  try {
    const res = await fetch(`https://ipfs.io/ipfs/${cid}`);
    if (res.ok) {
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
    }
  } catch (e) {}

  return null;
}

export { uploadFile, getFileData, calculateIpfsCID };
