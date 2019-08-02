import React, { useState, useEffect } from "react";
import { StripeProvider } from "react-stripe-elements";
import Checkout from "./Checkout";

export default function Stripe() {
  const [stripe, setStripe] = useState(null);
  useEffect(() => {
    setStripe(window.Stripe(process.env.LEDGER_SECRET));
  });
  return (
    <StripeProvider stripe={stripe}>
      <Checkout />
    </StripeProvider>
  );
}
