// react-native-razorpay ships no types of its own. Kept intentionally minimal —
// only the fields this app actually passes to/reads from RazorpayCheckout.open().
declare module 'react-native-razorpay' {
  export interface RazorpayCheckoutOptions {
    key: string;
    order_id: string;
    amount: string;
    currency: 'INR';
    name: string;
    description?: string;
    image?: string;
    prefill?: {
      name?: string;
      contact?: string;
      email?: string;
    };
    theme?: {
      color?: string;
    };
  }

  export interface RazorpayCheckoutSuccess {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  export interface RazorpayCheckoutError {
    code: number;
    description: string;
  }

  const RazorpayCheckout: {
    open: (options: RazorpayCheckoutOptions) => Promise<RazorpayCheckoutSuccess>;
  };

  export default RazorpayCheckout;
}
