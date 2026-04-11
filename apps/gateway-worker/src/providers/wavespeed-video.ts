import type {
  PollRequestInput,
  PollRequestResult,
  ProviderAdapter,
  SubmitRequestInput,
  SubmitRequestResult,
} from "./types.js";

export class WaveSpeedVideoAdapter implements ProviderAdapter {
  slug = "wavespeed-video";

  async submit(input: SubmitRequestInput): Promise<SubmitRequestResult> {
    return {
      mode: "async",
      upstreamRequestId: `ws_vid_${input.requestId}`,
      upstreamTaskId: `ws_vid_task_${input.requestId}`,
      pollAfterSeconds: 8,
      estimatedCost: 0.8,
    };
  }

  async poll(input: PollRequestInput): Promise<PollRequestResult> {
    return {
      done: false,
      pollAfterSeconds: 8,
      raw: { upstreamTaskId: input.upstreamTaskId, status: "processing" },
    };
  }
}
