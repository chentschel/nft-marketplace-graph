import { BigInt } from "@graphprotocol/graph-ts"
import {
  OrderCreated,
  OrderCancelled,
  OrderSuccessful,
} from "../entities/Marketplace/Marketplace"

import { NFT, Order } from "../entities/schema"

export function getNFTId(
  contractAddress: string,
  tokenId: string
): string {
  return contractAddress + '-' + tokenId
}

export function cancelActiveOrder(nft: NFT, now: BigInt): boolean {
  let oldOrder = Order.load(nft.activeOrder)

  if (oldOrder != null && oldOrder.status == 'open') {
    // Here we are setting old orders as cancelled, because the smart contract allows new orders to be created
    // and they just overwrite them in place. But the subgraph stores all orders ever
    // you can also overwrite ones that are expired
    oldOrder.status = 'cancelled' // status.CANCELLED
    oldOrder.updatedAt = now
    oldOrder.save()

    return true
  }
  return false
}

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
  nft.searchOrderStatus = order.status
  nft.searchOrderPrice = order.price
  nft.searchOrderCreatedAt = order.createdAt
  nft.searchOrderExpiresAt = order.expiresAt
  return nft
}

export function clearNFTOrderProperties(nft: NFT): NFT {
  nft.activeOrder = ''
  nft.searchOrderStatus = null
  nft.searchOrderPrice = null
  nft.searchOrderCreatedAt = null
  nft.searchOrderExpiresAt = null
  return nft
}

//// Handlers

export function handleOrderCreated(event: OrderCreated): void {

  let nftId = getNFTId(
    event.params.nftAddress.toHexString(),
    event.params.assetId.toString()
  )

  let nft = NFT.load(nftId)

  if (nft != null) {
    let orderId = event.params.id.toHex()
    let order = new Order(orderId)

    order.status = 'open'
    order.category = 'default'
    order.nft = nftId
    order.nftAddress = event.params.nftAddress
    order.txHash = event.transaction.hash
    order.owner = event.params.seller
    order.price = event.params.priceInWei
    order.expiresAt = event.params.expiresAt
    order.blockNumber = event.block.number
    order.createdAt = event.block.timestamp
    order.updatedAt = event.block.timestamp

    order.save()

    cancelActiveOrder(nft!, event.block.timestamp)

    nft = updateNFTOrderProperties(nft!, order)
    nft.save()

    // let count = buildCountFromOrder(order)
    // count.save()
  }
}

export function handleOrderSuccessful(event: OrderSuccessful): void {

  let nftId = getNFTId(
    event.params.nftAddress.toHexString(),
    event.params.assetId.toString()
  )

  let nft = NFT.load(nftId)

  if (nft != null) {
    let orderId = event.params.id.toHex()

    let order = new Order(orderId)
    order.category = 'default'
    order.status = 'sold'
    order.buyer = event.params.buyer
    order.price = event.params.totalPrice
    order.blockNumber = event.block.number
    order.updatedAt = event.block.timestamp
    order.save()

    nft.owner = event.params.buyer.toHex()
    nft = updateNFTOrderProperties(nft!, order)
    nft.save()
  }
}

export function handleOrderCancelled(event: OrderCancelled): void {

  let nftId = getNFTId(
    event.params.nftAddress.toHexString(),
    event.params.assetId.toString()
  )

  let nft = NFT.load(nftId)

  if (nft != null) {
    let orderId = event.params.id.toHex()

    let order = new Order(orderId)
    order.category = 'default'
    order.status = 'cancelled'
    order.blockNumber = event.block.number
    order.updatedAt = event.block.timestamp
    order.save()

    nft = updateNFTOrderProperties(nft!, order)
    nft.save()
  }
}
