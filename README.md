# General ILP Settlement Engine

This repository houses a general implementation of an ILP settlement engine per the proposed [Settlement RFC](https://github.com/interledger/rfcs/pull/536)!

## Usage

In contrast to the available PayPal and XRP settlement engines, this general abstraction inputs a plugin that requires two methods: `handleIncomingTransaction` and `settleOutgoingTransaction`. With these two methods alone, this engine can run direct payment settlements. 

If a platform such as Stripe requires an indirect payment flow in which a token needs to be authorized, supplying an additional method to the plugin, `embarkTransactionRequest`, will allow the engine to supply the token during the request for `PaymentDetails` via this function. Moreover, the engine assumes that `settleOutgoingTransaction` will resolve the token.

In addition, `configureAPI` and `subscribeAPI` are available to set up any platform's API. If `subscribeAPI` is not provided, the engine assumes that webhooks are needed to listen for incoming transactions and sets that route up. 

## TODO

- [ ] Add React interface to authorize payments for Stripe example
- [ ] Refactor indirect payment flow
- [ ] Add types for engine plugin methods
- [ ] Add integration tests
- [ ] Update README to account for new indirect payment flow

## Contributing

Pull requests are welcome. Please fork the repository and submit!