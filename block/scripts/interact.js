import fs from "fs";
import { ethers } from "ethers";

const HARHAT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function insert(cid, note = "") {
  if (!fs.existsSync("deployedAddress.txt")) {
    console.error("deployedAddress.txt not found. Run deploy first.");
    return;
  }

  const address = fs.readFileSync("deployedAddress.txt", "utf8").trim();
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const signer = new ethers.Wallet(HARHAT_PRIVATE_KEY, provider);

  const artifact = JSON.parse(fs.readFileSync("./artifacts/contracts/CIDStorage.sol/CIDStorage.json"));
  const contract = new ethers.Contract(address, artifact.abi, signer);

  const tx = await contract.storeCID(cid, note);
  await tx.wait();
  console.log("Stored CID:", cid);

  try {
    const info = await contract.getCIDInfo(cid);
    console.log("Stored CID info:", { timestamp: info[0].toNumber(), note: info[1] });
  } catch (err) {
    console.log("Could not fetch CID info:", err.message);
  }
}

export default insert;
