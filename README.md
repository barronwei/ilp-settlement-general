# General ILP Settlement Engine

This repository houses a general implementation of an ILP settlement engine per the proposed [Settlement RFC](https://github.com/interledger/rfcs/pull/536)!

## Usage

In contrast to the currently available PayPal and XRP settlement engines, this general abstraction inputs a plugin that requires two methods: `handleIncomingTransaction` and `settleOutgoingTransaction`. With these two methods alone, this engine can run both direct and indirect payment settlements. 

Moreover, `configureAPI` and `subscribeAPI` are available to set up any platform's API. If `subscribeAPI` is not provided, the engine assumes that webhooks are needed to listen for incoming transactions and sets that route up. `eliminateAPI` is available to account for any actions necessary when shutting down the settlement engine.

In order to authorize payments in an indirect payment flow, this abstraction utilizes `Next.js` to launch a server-side rendering of a React user interface for the counterparty.

## TODO

- [x] Dockerize the engine
- [ ] Test Dockerfile 
- [ ] Add React interface to authorize payments for Stripe example
- [ ] Complete general message controller and payment resolution
- [ ] Refactor indirect payment flow
- [ ] Add types for engine plugin methods
- [ ] Add types for Next.js in engine
- [ ] Add types for React
- [ ] Add integration tests

## Contributing

Pull requests are welcome. Please fork the repository and submit!