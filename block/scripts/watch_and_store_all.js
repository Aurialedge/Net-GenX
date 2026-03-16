const fs = require("fs");
const axios = require("axios");

async function main() {
  if (!fs.existsSync("deployedAddress.txt")) {
    console.error("deployedAddress.txt not found. Run deploy first.");
    process.exit(1);
  }

  const address = fs.readFileSync("deployedAddress.txt", "utf8").trim();
  const [signer] = await ethers.getSigners();
  const CIDFactory = await ethers.getContractFactory("CIDStorage");
  const contract = CIDFactory.attach(address).connect(signer);

  const IPFS_FILE_LIST = [
    "https://ipfs.io/ipfs/QmFileCID1",
    "https://ipfs.io/ipfs/QmFileCID2"
  ];

  const storedCIDs = new Set();
  const pollIntervalMs = 30000;

  async function fetchCID(ipfsUrl) {
    const res = await axios.get(ipfsUrl, { timeout: 15000 });
    const data = res.data;
    if (typeof data === "string") return data.trim();
    if (data && data.cid) return data.cid;
    if (data && data.CID) return data.CID;
    throw new Error("CID not found in IPFS file: " + ipfsUrl);
  }

  async function pollOnce() {
    for (const url of IPFS_FILE_LIST) {
      try {
        const cid = await fetchCID(url);
        if (!storedCIDs.has(cid)) {
          const tx = await contract.storeCID(cid);
          await tx.wait();
          storedCIDs.add(cid);
          console.log("Stored CID:", cid);
        }
      } catch (e) {
        console.error("err:", e.message || e);
      }
    }
  }

  await pollOnce();
  setInterval(pollOnce, pollIntervalMs);
}

main().catch((err) => { console.error(err); process.exit(1); });
