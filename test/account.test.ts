import 'mocha'
import * as chai from 'chai'
import * as sinon from 'sinon'
import axios from 'axios'
import { SettlementEngine } from '../src'
import { Account } from '../src/models/account'
import { TxHandlerResult } from '../src/models/plugin'

const Redis = require('ioredis-mock')
const assert = Object.assign(chai.assert, sinon.assert)

describe('Accounts', function () {
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
  })

  it('adds account', async () => {
    const response = await axios
      .post('http://localhost:3000/accounts', testAccount)
      .catch(err => {
        throw new Error(err.message)
      })
    assert.strictEqual(response.status, 201)
    const account = await engine.redis.get(
      `${engine.prefix}:accounts:${testAccount.id}`
    )
    if (account) {
      assert.deepEqual(JSON.parse(account), testAccount)
    } else {
      throw new Error('Failed to create account in database')
    }
  })

  it('does not add existing account', async () => {
    const existingAccount = testAccount

    await engine.redis.set(
      `${engine.prefix}:accounts:${existingAccount.id}`,
      JSON.stringify(existingAccount)
    )

    const response = await axios
      .post('http://localhost:3000/accounts', testAccount)
      .catch(err => {
        throw new Error(err.message)
      })

    assert.strictEqual(response.status, 201)

    const account = await engine.redis.get(
      `${engine.prefix}:accounts:${existingAccount.id}`
    )
    if (account) {
      assert.deepEqual(JSON.parse(account), existingAccount)
    } else {
      throw new Error('Failed to create account in database')
    }
  })

  it('finds account', async () => {
    await engine.redis.set(
      `${engine.prefix}:accounts:${testAccount.id}`,
      JSON.stringify(testAccount)
    )

    const response = await axios
      .get(`http://localhost:3000/accounts/${testAccount.id}`)
      .catch(err => {
        throw new Error(err.message)
      })

    assert.strictEqual(response.status, 200)
    assert.deepEqual(response.data, testAccount)
  })

  it('removes account', async () => {
    await engine.redis.set(
      `${engine.prefix}:accounts:${testAccount.id}`,
      JSON.stringify(testAccount)
    )

    const response = await axios
      .delete(`http://localhost:3000/accounts/${testAccount.id}`)
      .catch(err => {
        throw new Error(err.message)
      })

    const account = await engine.redis.get(
      `${engine.prefix}:accounts:${testAccount.id}`
    )

    assert.strictEqual(response.status, 204)
    assert.isNull(account)
  })
})
