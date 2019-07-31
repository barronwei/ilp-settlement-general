import * as getRawBody from 'raw-body'
import { Context } from 'koa'
import { randomBytes } from 'crypto'
import { PayDetails } from '../models/payDetails'

export interface Message {
  type: string
  data: any
}

export async function create (ctx: Context) {
  const buffer = await getRawBody(ctx.req)
  const message: Message = JSON.parse(buffer.toString())
  const reply = await handleMessage(message, ctx)

  ctx.body = reply
  ctx.status = 200
}

async function handleMessage (message: Message, ctx: Context) {
  const { type, data } = message
  const { address, params, payFlow, prefix, redis } = ctx
  const accountId: string = params.id
  const res = await redis.get(`${prefix}:accountId:${accountId}:tag`)
  const tag: number = res || randomBytes(4).readUInt32BE(0)
  if (!res) {
    await redis.set(`${prefix}:tag:${tag}:accountId`, accountId)
    await redis.set(`${prefix}:accountId:${accountId}:tag`, tag)
  }
  switch (type) {
    case 'paymentDetails':
      // TODO: Generate address based on pay flow
      const paymentDetails: PayDetails = {
        address,
        tag
      }
      return Buffer.from(JSON.stringify(paymentDetails))
    default:
      throw new Error(`This message type ${type} is unknown.`)
  }
}
