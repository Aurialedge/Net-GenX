import fs from "fs";
async function main() {
  const CIDStorage = await ethers.getContractFactory("CIDStorage");
  const cidStorage = await CIDStorage.deploy();
  await cidStorage.waitForDeployment();
  const address = await cidStorage.getAddress();
  fs.writeFileSync("deployedAddress.txt", address);
  console.log("CIDStorage deployed to:", address);
}
main().catch((err) => { console.error(err); process.exit(1); });
