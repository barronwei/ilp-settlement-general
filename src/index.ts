import * as Koa from 'koa'
import * as Router from 'koa-router'
import * as bodyParser from 'koa-bodyparser'
import * as ngrok from 'ngrok'
import * as ioredis from 'ioredis'
import axios from 'axios'
import { Server } from 'net'
import { v4 as uuidv4 } from 'uuid'

import { Account } from './models/account'
import {
  create as createAccount,
  search as searchAccount,
  remove as removeAccount
} from './controllers/account'
import { create as createMessage } from './controllers/message'
import { create as createSettlement } from './controllers/settlement'

const DEFAULT_HOST = 'localhost'
const DEFAULT_PORT = 3000

// 0 for test & 1 for live
const DEFAULT_MODE = false

const DEFAULT_CONNECTOR_URL = 'http://localhost:7771'
const DEFAULT_REDIS_PORT = 6379
const DEFAULT_MIN_UNITS = 1000000

export interface EngineConfig {
  host?: string
  port?: number
  mode?: boolean

  connectorUrl?: string

  redisPort?: number
  redis?: ioredis.Redis

  clientId: string
  secret: string
  address?: string

  prefix: string
  assetScale: number
  unitName: string
  minUnits?: number
}

export interface EnginePlugin {
  handleIncomingTransaction: any
  settleOutgoingTransaction: any
  embarkTransactionRequest?: any
  configureAPI?: any
  subscribeAPI?: any
  eliminateAPI?: any
}

export class SettlementEngine {
  // Engine Config
  app: Koa
  host: string
  port: number
  mode: boolean

  server: Server
  router: Router

  connectorUrl: string

  redisPort: number
  redis: ioredis.Redis

  clientId: string
  secret: string
  address: string

  prefix: string
  assetScale: number
  unitName: string
  minUnits: number

  // Plugin Config
  handleTX: any
  settleTX: any
  embarkTX?: any
  configureAPI?: any
  subscribeAPI?: any
  eliminateAPI?: any

  constructor (config: EngineConfig, plugin: EnginePlugin) {
    this.app = new Koa()
    this.app.use(async (ctx, next) => {
      if (ctx.path.includes('messages')) ctx.disableBodyParser = true
      await next()
    })
    this.app.use(bodyParser())

    this.host = config.host || DEFAULT_HOST
    this.port = config.port || DEFAULT_PORT
    this.mode = config.mode || DEFAULT_MODE

    this.connectorUrl = config.connectorUrl || DEFAULT_CONNECTOR_URL

    this.redisPort = config.redisPort || DEFAULT_REDIS_PORT
    this.redis = config.redis || new ioredis(this.redisPort)

    this.clientId = config.clientId
    this.secret = config.secret
    this.address = config.address || config.clientId

    this.prefix = config.prefix
    this.assetScale = config.assetScale
    this.unitName = config.unitName
    this.minUnits = config.minUnits || DEFAULT_MIN_UNITS

    this.handleTX = plugin.handleIncomingTransaction
    this.settleTX = plugin.settleOutgoingTransaction
    this.embarkTX = plugin.embarkTransactionRequest
    this.configureAPI = plugin.configureAPI
    this.subscribeAPI = plugin.subscribeAPI
    this.eliminateAPI = plugin.eliminateAPI

    this.app.context.redis = this.redis
    this.app.context.address = this.address
    this.app.context.prefix = this.prefix
    this.app.context.assetScale = this.assetScale
    this.app.context.settleAccount = this.settleAccount.bind(this)

    if (this.embarkTX) {
      this.app.context.settleTX = this.settleTX.bind(this)
    }

    // Routes
    this.router = new Router()
    this.setupRoutes()
    this.app.use(this.router.routes())
  }

  async findAccountMiddleware (ctx: Koa.Context, next: () => Promise<any>) {
    const { params, prefix, redis } = ctx
    const account = await redis.get(`${prefix}:accounts:${params.id}`)
    account ? (ctx.account = JSON.parse(account)) : ctx.throw(404)
    await next()
  }

  private setupRoutes () {
    // Accounts
    this.router.post('/accounts', ctx => createAccount(ctx))
    this.router.get('/accounts/:id', ctx => searchAccount(ctx))
    this.router.delete('/accounts/:id', ctx => removeAccount(ctx))

    // Messages
    this.router.post(
      '/accounts/:id/messages',
      this.findAccountMiddleware,
      createMessage
    )

    // Settlement
    this.router.post(
      '/accounts/:id/settlement',
      this.findAccountMiddleware,
      createSettlement
    )

    // Webhooks
    if (!this.subscribeAPI) {
      this.router.post('/accounts/:id/webhooks', ctx =>
        this.handleTransaction(ctx)
      )
    }
  }

  async getPaymentDetails (accountId: string, units: string) {
    const url = `${this.connectorUrl}\\accounts\\${accountId}\\messages`
    const msg = this.embarkTX
      ? {
        type: 'paymentRequest',
        data: {
          token: await this.embarkTX(
            this.clientId,
            this.secret,
            this.address
          ),
          units
        }
      }
      : { type: 'paymentDetails' }
    const res = await axios.post(url, Buffer.from(JSON.stringify(msg)), {
      timeout: 10000,
      headers: {
        'Content-type': 'application/octet-stream',
        'Idempotency-Key': uuidv4()
      }
    })
    return res.data
  }

  async settleAccount (account: Account, units: string) {
    const { id } = account
    console.log(
      `Attempting to send ${units} ${this.unitName} to account: ${id}`
    )
    try {
      const details = await this.getPaymentDetails(id, units).catch(err => {
        console.error('Error getting payment details from counterparty', err)
        throw err
      })
      if (!this.embarkTX) {
        await this.settleTX(details, units)
      }
    } catch (err) {
      console.error(`Failed to send ${units} ${this.unitName} to ${id}:`, err)
    }
  }

  private async notifySettlement (accountId: string, amount: string) {
    const url = `${this.connectorUrl}\\accounts\\${accountId}\\settlement`
    const message = {
      amount,
      scale: this.assetScale
    }
    await axios
      .post(url, message, {
        timeout: 10000
      })
      .catch(err => {
        console.error('Failed to notify connector of settlement:', err)
      })
  }

  private async handleTransaction (ctx: Koa.Context) {
    const { res, val }: { res: Boolean; val: any } = await this.handleTX(ctx)
    const { id, pay }: { id: string; pay: string } = val
    if (res) {
      try {
        const accountId = await this.redis.get(
          `${this.prefix}:tag:${id}:accountId`
        )
        const accJSON = await this.redis.get(
          `${this.prefix}:accounts:${accountId}`
        )
        if (accJSON) {
          const acc = JSON.parse(accJSON)
          const units = Number(pay) * 10 ** this.assetScale
          await this.notifySettlement(acc.id, units.toString())
          console.log(`Credits ${acc.id} with ${units} ${this.unitName}!`)
          ctx.body = 200
        }
      } catch (err) {
        console.error('Failed to find account under', id, err)
        ctx.body = 404
      }
    } else {
      console.error('Subscription found invalid transaction!')
      ctx.body = 404
    }
  }

  public async start () {
    this.server = this.app.listen(this.port, this.host)
    console.log('Starting to listen on', this.port)

    const urlName =
      this.host === DEFAULT_HOST
        ? await ngrok.connect(this.port)
        : `https://${this.host}:${this.port}`
    console.log(`Engine running at ${urlName}!`)

    if (this.configureAPI) {
      await this.configureAPI({
        address: this.address,
        client: this.clientId,
        secret: this.secret,
        mode: this.mode,
        host: urlName
      })
    }
    console.log(`Starting engine in ${this.mode ? 'live' : 'test'} mode!`)

    if (this.subscribeAPI) {
      await this.subscribeAPI({
        urlName,
        handler: this.handleTransaction.bind(this)
      })
      console.log('Initializing subscriptions!')
    } else {
      console.log(`Webhooks at ${urlName}/accounts/${this.clientId}/webhooks!`)
    }

    console.log(
      `Listening for incoming ${
        this.prefix
      } payments and polling Redis for accounts that need settlements!`
    )
  }

  public async close () {
    console.log('Shutting down engine!')
    if (this.eliminateAPI) {
      await this.eliminateAPI()
    }
    if (this.host === DEFAULT_HOST) {
      await ngrok.disconnect()
      this.server.close()
    } else {
      this.server.close()
    }
  }
}
