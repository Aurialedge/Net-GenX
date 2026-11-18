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
    event CIDResubmitted(string cid, address indexed submitter, uint256 timestamp, string attemptedNote);

    /// Anchors an evidence CID. Records are write-once: the first anchor (timestamp + note)
    /// is the chain-of-custody record and can never be overwritten. A re-submission of an
    /// already-anchored CID is kept as an audit event only, so callers stay idempotent.
    function storeCID(string memory _cid, string memory _note) public {
        require(bytes(_cid).length > 0, "CID cannot be empty");
        if (cidMap[_cid].timestamp != 0) {
            emit CIDResubmitted(_cid, msg.sender, block.timestamp, _note);
            return;
        }
        allCIDs.push(_cid);
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
