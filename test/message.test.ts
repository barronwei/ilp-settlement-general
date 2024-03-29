import 'mocha'
import * as chai from 'chai'
import * as sinon from 'sinon'
import axios from 'axios'
import { getLocal, Mockttp } from 'mockttp'
import { SettlementEngine } from '../src'
import { Account } from '../src/models/account'
import { TxHandlerResult } from '../src/models/plugin'

const Redis = require('ioredis-mock')
const assert = Object.assign(chai.assert, sinon.assert)

describe('Messages', function () {
  let mockttp: Mockttp
  let engine: SettlementEngine

  const testAccount: Account = {
    id: 'testId'
  }

  const TxResult: TxHandlerResult = {
    result: true,
    value: {
      id: '123',
      pay: '123'
    }
  }

  beforeEach(async () => {
    mockttp = getLocal()
    await mockttp.start(7777)

    engine = new SettlementEngine(
      {
        redis: new Redis(),
        clientId: 'test123',
        secret: 'secret',
        prefix: '',
        assetScale: 1,
        unitName: ''
      },
      {
        handleTx: async () => TxResult,
        settleTx: async () => true
      }
    )

    await engine.start()
  })

  afterEach(async () => {
    await engine.close()
    await mockttp.stop()
  })

  it('Requests payment details from counterparty', async () => {
    await engine.redis.set(
      `${engine.prefix}:accounts:${testAccount.id}`,
      JSON.stringify(testAccount)
    )

    const message = {
      type: 'paymentDetails'
    }
    const rawBytes = Buffer.from(JSON.stringify(message))

    const response = await axios
      .post(
        `http://localhost:3000/accounts/${testAccount.id}/messages`,
        rawBytes,
        {
          headers: {
            'content-type': 'application/octet-stream'
          }
        }
      )
      .catch(err => {
        throw new Error(err.message)
      })

    assert.strictEqual(response.status, 200)
    assert.deepEqual(response.data, {
      address: engine.address
    })
  })

  it('Returns correct payment details if previously set', async () => {
    await engine.redis.set(
      `${engine.prefix}:accounts:${testAccount.id}`,
      JSON.stringify(testAccount)
    )

    const message = {
      type: 'paymentDetails'
    }
    const rawBytes = Buffer.from(JSON.stringify(message))

    const response = await axios
      .post(
        `http://localhost:3000/accounts/${testAccount.id}/messages`,
        rawBytes,
        {
          headers: {
            'content-type': 'application/octet-stream'
          }
        }
      )
      .catch(err => {
        throw new Error(err.message)
      })

    assert.strictEqual(response.status, 200)
    assert.deepEqual(response.data, {
      address: engine.address
    })
  })
})
