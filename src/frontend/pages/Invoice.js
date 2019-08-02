import React from "react";
import { CardElement, injectStripe } from "react-stripe-elements";

function Invoice() {
  const submit = () => {};

  return (
    <div>
      <CardElement />
      <button onClick={submit}>Submit</button>
    </div>
  );
}

export default injectStripe(Invoice);
