export interface TxHandlerResult {
  result: boolean
  value: {
    id: string
    pay: string
  }
}

export interface ApiConfigureParam {
  address: string
  client: string
  secret: string
  mode: boolean
  host: string
}

export interface ApiSubscribeParam {
  host: string
  handler: any
}
