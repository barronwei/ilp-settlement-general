import React, { useState, useEffect } from "react";
import { StripeProvider, Elements } from "react-stripe-elements";
import Invoice from "./Invoice";

export default function Stripe() {
  const [stripe, setStripe] = useState(null);
  useEffect(() => {
    setStripe(window.Stripe(process.env.LEDGER_SECRET));
  });
  return (
    <StripeProvider stripe={stripe}>
      <Elements>
        <Invoice />
      </Elements>
    </StripeProvider>
  );
}
