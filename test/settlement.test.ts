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

describe('Accounts Settlement', function () {
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
        connectorUrl: 'http://localhost:7777',
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
    await mockttp.stop()
    await engine.close()
  })

  it('Notifies connector of incoming settlement via webhooks', async () => {
    const mockEndpoint = await mockttp
      .post(`/accounts/${testAccount.id}/settlement`)
      .thenReply(200)

    await engine.redis.set(
      `${engine.prefix}:accounts:${testAccount.id}`,
      JSON.stringify(testAccount)
    )

    sinon.stub(engine, 'handleTx').resolves({
      result: true,
      value: { id: testAccount.id, pay: '5' }
    })

    const response = await axios
      .post(
        `http://localhost:3000/accounts/${engine.clientId}/webhooks`,
        testAccount.id
      )
      .catch(err => {
        throw new Error(err.message)
      })

    const requests = await mockEndpoint.getSeenRequests()
    const request = requests[0]

    assert.strictEqual(response.status, 200)
    assert.strictEqual(requests.length, 1)
    assert.deepEqual(request.body.json, {
      amount: '50',
      scale: engine.assetScale
    })
  })

  it('Attempts to get payment details from counterparty', async () => {
    const paymentDetails = {
      address: 'test123'
    }
    const mockMessageEndpoint = await mockttp
      .post(`/accounts/${testAccount.id}/messages`)
      .thenReply(201, Buffer.from(JSON.stringify(paymentDetails)))

    await engine.redis.set(
      `${engine.prefix}:accounts:${testAccount.id}`,
      JSON.stringify(testAccount)
    )

    const response = await axios.post(
      `http://localhost:3000/accounts/${testAccount.id}/settlement`,
      {
        amount: '5000000000',
        scale: 10
      }
    )

    const requests = await mockMessageEndpoint.getSeenRequests()
    const [request] = requests

    assert.strictEqual(response.status, 201)
    assert.strictEqual(requests.length, 1)
    assert.deepEqual(request.body.json, {
      type: 'paymentDetails'
    })
  })
})
