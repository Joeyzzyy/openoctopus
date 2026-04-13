export type Capability = "image_generation" | "image_edit" | "video_generation";

export type ProviderRuntimeContext = {
  slug: string;
  baseUrl: string | null;
  config: Record<string, unknown> | null;
  secret: string;
};

export type SubmitRequestInput = {
  requestId: string;
  capability: Capability;
  publicModelSlug: string;
  upstreamModelSlug: string;
  prompt?: string;
  input: Record<string, unknown>;
  provider: ProviderRuntimeContext;
};

export type PollRequestInput = {
  requestId: string;
  upstreamTaskId: string;
  provider: ProviderRuntimeContext;
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
  poll?(input: PollRequestInput): Promise<PollRequestResult>;
}
