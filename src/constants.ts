export class EventMessages {
    RES_NEVER_SUBSCRIBED: string =
        "Subscription cancellation test not possible: The testbench was never subscribed to the event due to a subscription error (see subscriptionReport)."
}
export class ObservePropertyMessages {
    RES_NEVER_SUBSCRIBED: string =
        "Subscription cancellation test not possible: The testbench was never observing the property due to a subscription error (see subscriptionReport)."
}
export const RES_NO_DATA = "Never received any data, thus no checks could be made."
export const RES_TIMEOUT_DURING_SUBSCRIPTION = "Subscription cancellation test not possible: Timeout during subscription (see subscriptionReport)."
export const RES_ERROR_CANCELING_SUBSCRIPTION = "Error while canceling subscription: "
