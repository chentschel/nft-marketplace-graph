import { log } from "@graphprotocol/graph-ts"
import {
  ItemCreated,
  Transfer,
  ArtToken,
} from "../entities/ArtToken/ArtToken"

import { Account, NFT } from "../entities/schema"
import { getNFTId } from "./utils";

export function handleItemCreated(event: ItemCreated): void {

  let nftId = getNFTId(
    event.address.toHexString(),
    event.params.tokenId.toString()
  )

  let nft = new NFT(nftId)

  nft.owner = event.params.owner.toHex()
  nft.registryAddress = event.address
  nft.tokenId = event.params.tokenId

  let contract = ArtToken.bind(event.address)

  nft.name = contract.name()
  nft.tokenURI = contract.tokenURI(event.params.tokenId)

  nft.blockNumber = event.block.number
  nft.createdAt = event.block.timestamp
  nft.updatedAt = event.block.timestamp

  nft.save()

  /// Check
  let account = new Account(event.params.owner.toHexString())

  account.address = event.params.owner
  account.nfts.push(nftId)
  account.save()
}

export function handleTransfer(event: Transfer): void {
  log.debug('transfers....', [])
}
