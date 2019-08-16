import { EngineConfig, EnginePlugin, SettlementEngine } from '../..'
import { Context } from 'koa'
import * as ioredis from 'ioredis'

const ENGINE_HOST = process.env.ENGINE_HOST || 'localhost'
const ENGINE_PORT = process.env.ENGINE_POST || 3000
const ENGINE_MODE = process.env.ENGINE_MODE || false

const LEDGER_PAY_FLOW = true

const CONNECTOR_URL = process.env.CONNECTOR_URL || 'http://localhost:7771'

const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = process.env.REDIS_PORT || 6379

const LEDGER_CLIENT_ID = process.env.LEDGER_CLIENT_ID || ''
const LEDGER_SECRET = process.env.LEDGER_SECRET || ''
const LEDGER_ADDRESS = process.env.LEDGER_ADDRESS || ''

const LEDGER_PREFIX = process.env.LEDGER_PREFIX || 'stripe'
const LEDGER_ASSET_SCALE = process.env.LEDGER_ASSET_SCALE || 2
const LEDGER_UNIT_NAME = process.env.LEDGER_UNIT_NAME || 'cents'
const LEDGER_MIN_UNITS = process.env.LEDGER_MIN_CENTS || 1000000
const LEDGER_CURRENCY = process.env.LEDGER_CURRENCY || 'USD'

const stripe = require('stripe')(LEDGER_SECRET)

async function handleIncomingTransaction (ctx: Context) {
  const { body } = ctx.request
  const { object, amount, description, paid, status } = body.data.object
  switch (object) {
    case 'charge':
      if (paid) {
        switch (status) {
          case 'succeeded':
            return { res: true, val: { id: description, pay: amount } }
          default:
            console.error(`Charge has ${status} status!`)
            ctx.body = 404
        }
      }
      return
    default:
      console.error(`Webhook received a type ${object} notification!`)
      ctx.body = 404
  }
}

async function settleOutgoingTransaction (data: any, units: string) {
  const { token, id } = data
  const amount = Number(units) / 10 ** this.assetScale
  const charge = await stripe.charge({
    amount,
    currency: LEDGER_CURRENCY,
    source: token,
    description: id
  })
  console.log(charge)
}

async function configureAPI (apiConfig: any) {
  const { host } = apiConfig
  await stripe.webhookEndpoints.create({
    url: `${host}/accounts/${LEDGER_CLIENT_ID}/webhooks`,
    enabled_events: ['charge.succeeded']
  })
}

const config: EngineConfig = {
  host: ENGINE_HOST,
  port: +ENGINE_PORT,
  mode: !!ENGINE_MODE,

  payFlow: !!LEDGER_PAY_FLOW,

  connectorUrl: CONNECTOR_URL,

  redisHost: REDIS_HOST,
  redisPort: +REDIS_PORT,
  redis: new ioredis({ host: REDIS_HOST, port: +REDIS_PORT }),

  clientId: LEDGER_CLIENT_ID,
  secret: LEDGER_SECRET,
  address: LEDGER_ADDRESS,

  prefix: LEDGER_PREFIX,
  assetScale: +LEDGER_ASSET_SCALE,
  unitName: LEDGER_UNIT_NAME,
  minUnits: +LEDGER_MIN_UNITS
}

const plugin: EnginePlugin = {
  handleIncomingTransaction,
  settleOutgoingTransaction,
  configureAPI
}

const engine = new SettlementEngine(config, plugin)

engine.start().catch(err => console.error(err))
