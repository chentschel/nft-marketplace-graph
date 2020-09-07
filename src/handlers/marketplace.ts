import { log } from "@graphprotocol/graph-ts"
import { getNFTId } from "./utils";
import {
  BidCreated,
  BidAccepted,
  BidCancelled,
  OrderCreated,
  OrderUpdated,
  OrderCancelled,
  OrderSuccessful,
} from "../entities/Marketplace/Marketplace"


import { NFT, Order, Bid } from "../entities/schema"

export function updateNFTOrderProperties(nft: NFT, order: Order): NFT {
  if (order.status == 'open') {
    return addNFTOrderProperties(nft, order)

  } else if (order.status == 'sold' || order.status == 'cancelled') {
    return clearNFTOrderProperties(nft)

  } else {
    return nft
  }
}

export function addNFTOrderProperties(nft: NFT, order: Order): NFT {
  nft.activeOrder = order.id
  nft.searchOrderPrice = order.price
  nft.searchOrderStatus = order.status
  nft.searchOrderExpiresAt = order.expiresAt
  nft.searchOrderCreatedAt = order.createdAt

  return nft
}

export function clearNFTOrderProperties(nft: NFT): NFT {
  nft.activeOrder = ''
  nft.searchOrderPrice = null
  nft.searchOrderStatus = null
  nft.searchOrderExpiresAt = null
  nft.searchOrderCreatedAt = null

  return nft
}

//// Handlers

export function handleOrderCreated(event: OrderCreated): void {

  let nftId = getNFTId(
    event.params.nftAddress.toHexString(),
    event.params.assetId.toString()
  )

  let nft = NFT.load(nftId)

  if (nft == null) {
    log.debug("handleOrderCreated(): invalid NFT :: {}", [nftId])

    return
  }

  let orderId = event.params.id.toHex()
  let order = new Order(orderId)

  order.nft = nftId
  order.nftAddress = event.params.nftAddress

  order.status = 'open'

  order.seller = event.params.seller
  order.price = event.params.priceInWei

  order.txHash = event.transaction.hash
  order.blockNumber = event.block.number

  order.expiresAt = event.params.expiresAt
  order.createdAt = event.block.timestamp
  order.updatedAt = event.block.timestamp

  order.save()

  nft = updateNFTOrderProperties(nft!, order)
  nft.save()

  // let count = buildCountFromOrder(order)
  // count.save()
}

export function handleOrderSuccessful(event: OrderSuccessful): void {

  let orderId = event.params.id.toHex()
  let order = Order.load(orderId)

  order.status = 'sold'
  order.buyer = event.params.buyer
  order.price = event.params.priceInWei
  order.blockNumber = event.block.number
  order.updatedAt = event.block.timestamp

  order.save()

  /// Update NFT .

  let nft = NFT.load(order.nft)

  nft.owner = event.params.buyer.toHex()
  nft = updateNFTOrderProperties(nft!, order!)
  nft.save()
}

export function handleOrderCancelled(event: OrderCancelled): void {

  let orderId = event.params.id.toHex()
  let order = Order.load(orderId)

  order.status = 'cancelled'
  order.blockNumber = event.block.number
  order.updatedAt = event.block.timestamp
  order.save()

  /// Update NFT

  let nft = NFT.load(order.nft)

  nft = updateNFTOrderProperties(nft!, order!)
  nft.save()
}
