// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TheGameKardashianCollector is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    
    uint256 public constant MAX_SUPPLY = 100;
    uint256 public constant PRICE = 0.001 ether; // Ultra-low price in ETH
    
    string private _baseTokenURI;
    
    mapping(uint256 => bool) public tokenExists;
    
    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);
    
    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI,
        address initialOwner
    ) ERC721(name, symbol) Ownable(initialOwner) {
        _baseTokenURI = baseTokenURI;
        _tokenIdCounter = 1; // Start from token ID 1
    }
    
    function mint(address to, string memory tokenURI) public onlyOwner {
        require(_tokenIdCounter < MAX_SUPPLY, "Max supply reached");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        tokenExists[tokenId] = true;
        
        emit NFTMinted(to, tokenId, tokenURI);
    }
    
    function batchMint(address to, string[] memory tokenURIs) public onlyOwner {
        require(
            _tokenIdCounter + tokenURIs.length <= MAX_SUPPLY,
            "Batch mint would exceed max supply"
        );
        
        for (uint256 i = 0; i < tokenURIs.length; i++) {
            mint(to, tokenURIs[i]);
        }
    }
    
    function publicMint(string memory tokenURI) public payable {
        require(msg.value >= PRICE, "Insufficient payment");
        require(_tokenIdCounter < MAX_SUPPLY, "Max supply reached");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        tokenExists[tokenId] = true;
        
        emit NFTMinted(msg.sender, tokenId, tokenURI);
        
        // Send payment to owner
        payable(owner()).transfer(msg.value);
    }
    
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }
    
    function setBaseURI(string memory baseTokenURI) public onlyOwner {
        _baseTokenURI = baseTokenURI;
    }
    
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }
}