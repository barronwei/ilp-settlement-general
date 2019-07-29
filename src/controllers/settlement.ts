import { Context } from 'koa'
import { normalizeAsset } from '../utils/normalizeAsset'

export async function create (ctx: Context) {
  const { assetScale, params, prefix, redis, request } = ctx
  const accJSON = await redis.get(`${prefix}:accounts:${params.id}`)
  const acc = JSON.parse(accJSON)

  const { body } = request
  const amt = normalizeAsset(body.scale, assetScale, BigInt(body.amount))
  await ctx.settleAccount(acc, amt.toString())

  ctx.status = 200
}
