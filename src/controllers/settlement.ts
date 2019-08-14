import { Context } from 'koa'
import { normalizeAsset } from '../utils/normalizeAsset'

export async function create (ctx: Context) {
  const { assetScale, params, prefix, redis, request, settleAccount } = ctx
  const accJSON = await redis.get(`${prefix}:accounts:${params.id}`)
  const { body } = request
  const amount = normalizeAsset(body.scale, assetScale, BigInt(body.amount))
  await settleAccount(JSON.parse(accJSON), amount.toString())
  const commit = {
    scale: assetScale,
    amount: amount.toString()
  }
  ctx.body = commit
  ctx.status = 201
}
