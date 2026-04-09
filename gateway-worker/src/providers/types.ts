export type Capability = "image_generation" | "image_edit" | "video_generation";

export type SubmitRequestInput = {
  requestId: string;
  capability: Capability;
  publicModelSlug: string;
  prompt?: string;
  input: Record<string, unknown>;
};

export type SubmitRequestResult =
  | {
      mode: "sync";
      upstreamRequestId: string;
      output: Record<string, unknown>;
      estimatedCost: number;
    }
  | {
      mode: "async";
      upstreamRequestId: string;
      upstreamTaskId: string;
      pollAfterSeconds: number;
      estimatedCost: number;
    };

export type PollRequestResult =
  | {
      done: false;
      pollAfterSeconds: number;
      raw: Record<string, unknown>;
    }
  | {
      done: true;
      success: true;
      output: Record<string, unknown>;
      actualCost: number;
      raw: Record<string, unknown>;
    }
  | {
      done: true;
      success: false;
      errorCode: string;
      errorMessage: string;
      raw: Record<string, unknown>;
    };

export interface ProviderAdapter {
  slug: string;
  submit(input: SubmitRequestInput): Promise<SubmitRequestResult>;
  poll?(upstreamTaskId: string): Promise<PollRequestResult>;
}
