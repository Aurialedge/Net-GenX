const CID = await ethers.getContractFactory("CIDStorage");
const cid = CID.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");  // from deployedAddress.txt

await cid.getAllCIDs();    // prints the whole array
await cid.getLatestCID();  // prints just the latest
await cid.totalCIDs();  