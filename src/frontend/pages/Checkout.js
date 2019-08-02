import React from "react";
import { Elements } from "react-stripe-elements";
import Invoice from "./Invoice";

function Checkout() {
  return (
    <div>
      <Elements>
        <Invoice />
      </Elements>
    </div>
  );
}

export default Checkout;
