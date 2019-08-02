import React, { useState, useEffect } from "react";
import { StripeProvider, Elements } from "react-stripe-elements";
import Form from "./Form";

export default function Stripe() {
  const [stripe, setStripe] = useState(null);
  useEffect(() => {
    setStripe(window.Stripe(process.env.LEDGER_SECRET));
  });
  return (
    <StripeProvider stripe={stripe}>
      <Elements>
        <Form />
      </Elements>
    </StripeProvider>
  );
}
