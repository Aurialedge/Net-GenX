// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CIDStorage {
    struct CIDInfo {
        uint256 timestamp;
        string note;
    }

    mapping(string => CIDInfo) public cidMap;
    string[] public allCIDs;

    event CIDStored(string cid, address indexed uploader, uint256 timestamp, string note);

    function storeCID(string memory _cid, string memory _note) public {
        require(bytes(_cid).length > 0, "CID cannot be empty");
        if (cidMap[_cid].timestamp == 0) {
            allCIDs.push(_cid);
        }
        cidMap[_cid] = CIDInfo({ timestamp: block.timestamp, note: _note });
        emit CIDStored(_cid, msg.sender, block.timestamp, _note);
    }

    function getCIDInfo(string memory _cid) public view returns (uint256, string memory) {
        CIDInfo memory info = cidMap[_cid];
        require(info.timestamp > 0, "CID not found");
        return (info.timestamp, info.note);
    }

    function getAllCIDs() public view returns (string[] memory) {
        return allCIDs;
    }

    function totalCIDs() public view returns (uint256) {
        return allCIDs.length;
    }
}
