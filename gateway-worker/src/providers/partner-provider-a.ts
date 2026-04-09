import type { ProviderAdapter, SubmitRequestInput, SubmitRequestResult } from "./types.js";

export class PartnerProviderAAdapter implements ProviderAdapter {
  slug = "partner-provider-a";

  async submit(input: SubmitRequestInput): Promise<SubmitRequestResult> {
    return {
      mode: "sync",
      upstreamRequestId: `ppa_${input.requestId}`,
      output: {
        assets: [],
        status: "succeeded",
      },
      estimatedCost: 0.09,
    };
  }
}
