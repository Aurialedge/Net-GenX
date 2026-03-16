import fs from "fs";
import { ethers } from "ethers";

export default async function retrieve() {
  if (!fs.existsSync("deployedAddress.txt")) throw new Error("Contract not deployed");

  const address = fs.readFileSync("deployedAddress.txt", "utf8").trim();
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const artifact = JSON.parse(fs.readFileSync("./artifacts/contracts/CIDStorage.sol/CIDStorage.json"));
  const contract = new ethers.Contract(address, artifact.abi, provider);

  const allCIDs = await contract.getAllCIDs();
  const result = [];
  for (let cid of allCIDs) {
    const info = await contract.getCIDInfo(cid);
    // result.push({ cid, timestamp: info[0].toNumber(), note: info[1] }); 
    result.push({ cid, timestamp: info[0].toString(), note: info[1] });

  }
  return result;
}
