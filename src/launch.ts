import { EngineConfig, EnginePlugin, SettlementEngine } from '.'
import * as ioredis from 'ioredis'

const ENGINE_HOST = process.env.ENGINE_HOST || 'localhost'
const ENGINE_PORT = process.env.ENGINE_POST || 3000
const ENGINE_MODE = process.env.ENGINE_MODE || false

const CONNECTOR_URL = process.env.CONNECTOR_URL || 'http://localhost:7771'

const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = process.env.REDIS_PORT || 6379

const LEDGER_CLIENT_ID = process.env.LEDGER_CLIENT_ID || ''
const LEDGER_SECRET = process.env.LEDGER_SECRET || ''
const LEDGER_ADDRESS = process.env.LEDGER_ADDRESS || ''
const LEDGER_PAY_FLOW = process.env.LEDGER_PAY_FLOW || false

const LEDGER_PREFIX = process.env.LEDGER_PREFIX || ''
const LEDGER_ASSET_SCALE = process.env.LEDGER_ASSET_SCALE || 2
const LEDGER_UNIT_NAME = process.env.LEDGER_UNIT_NAME || ''
const LEDGER_MIN_UNITS = process.env.LEDGER_MIN_CENTS || 1000000

const LEDGER_HANDLE_TRANSACTION = process.env.LEDGER_HANDLE_TRANSACTION
const LEDGER_SETTLE_TRANSACTION = process.env.LEDGER_SETTLE_TRANSACTION
const LEDGER_CONFIGURE_API = process.env.LEDGER_CONFIGURE_API
const LEDGER_SUBSCRIBE_API = process.env.LEDGER_SUBSCRIBE_API
const LEDGER_ELIMINATE_API = process.env.LEDGER_ELIMINATE_API

const config: EngineConfig = {
  host: ENGINE_HOST,
  port: +ENGINE_PORT,
  mode: !!ENGINE_MODE,

  connectorUrl: CONNECTOR_URL,

  redisHost: REDIS_HOST,
  redisPort: +REDIS_PORT,
  redis: new ioredis({ host: REDIS_HOST, port: +REDIS_PORT }),

  clientId: LEDGER_CLIENT_ID,
  secret: LEDGER_SECRET,
  address: LEDGER_ADDRESS,

  payFlow: !!LEDGER_PAY_FLOW,

  prefix: LEDGER_PREFIX,
  assetScale: +LEDGER_ASSET_SCALE,
  unitName: LEDGER_UNIT_NAME,
  minUnits: +LEDGER_MIN_UNITS
}

const plugin: EnginePlugin = {
  handleIncomingTransaction: LEDGER_HANDLE_TRANSACTION,
  settleOutgoingTransaction: LEDGER_SETTLE_TRANSACTION,
  configureAPI: LEDGER_CONFIGURE_API,
  subscribeAPI: LEDGER_SUBSCRIBE_API,
  eliminateAPI: LEDGER_ELIMINATE_API
}

const engine = new SettlementEngine(config, plugin)

engine.start().catch(err => console.error(err))
