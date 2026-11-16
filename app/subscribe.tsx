import Paywall from './paywall'

/** Hard-paywall gate (see components/subscription/PaywallGate): the paywall with no way to dismiss it. */
export default function Subscribe() {
  return <Paywall gate />
}
