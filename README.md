# General ILP Settlement Engine

This repository houses a general implementation of an ILP settlement engine per the proposed [Settlement RFC](https://github.com/interledger/rfcs/pull/536)!

## Purpose

In order to avoid maintaining multiple repositories that include the same boilerplate settlement engine code, this abstraction provides a plugin format in which anyone who wishes to build a settlement engine for a payment network can simply import this abstraction and provide the corresponding plugin of methods from the payment network API.

## Usage

In contrast to the currently available PayPal and XRP settlement engines, this general abstraction inputs a plugin that requires two methods: `handleTransaction` and `settleTransaction`. With these methods, this engine can run either direct or indirect payment settlements, depending on the `payFlow` boolean property.

With direct payment settlements, the user would simply send payments with `settleTransaction` and the counterparty would listen via subscription or webhook and resolve the payment with `handleTransaction`.

With indirect payment settlements, the counterparty sends a url to the user in order for the user to authorize the payment. Upon doing so, the counterparty would post a request to their own webhook endpoint and resolve the payment.

Moreover, `configureAPI` and `subscribeAPI` are available to set up any platform's API. If `subscribeAPI` is not available, the engine assumes that a webhook is necessary to listen for incoming transactions and sets that route up. `eliminateAPI` is available to account for any actions necessary when shutting down the settlement engine.

In order to authorize payments in an indirect payment flow, this abstraction utilizes `Next.js` to launch a server-side rendering of a React user interface for the counterparty.

## TODO

- [x] Dockerize the engine
- [ ] Test Dockerfile
- [ ] Fix Stripe example
- [x] Complete general message controller and payment resolution
- [x] Refactor indirect payment flow
- [x] Add types for engine plugin methods
- [ ] Add types for Next.js in engine
- [ ] Add types for React
- [ ] Add integration tests
- [ ] Load Next.js pages from external directory

## Contributing

Pull requests are welcome. Please fork the repository and submit!
