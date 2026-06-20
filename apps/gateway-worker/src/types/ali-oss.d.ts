declare module "ali-oss" {
  type OssHeaders = Record<string, string | string[] | undefined>;

  type OssClientOptions = {
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    endpoint?: string;
    region?: string;
    secure?: boolean;
  };

  type OssPutOptions = {
    headers?: Record<string, string>;
  };

  type OssSignatureOptions = {
    expires?: number;
    method?: "GET" | "PUT";
    "Content-Type"?: string;
  };

  type OssGetResult = {
    content: Buffer | Uint8Array | string;
    res?: {
      headers?: OssHeaders;
    };
  };

  class OSS {
    constructor(options: OssClientOptions);
    put(name: string, file: Buffer | Uint8Array | string, options?: OssPutOptions): Promise<unknown>;
    get(name: string): Promise<OssGetResult>;
    signatureUrl(name: string, options?: OssSignatureOptions): string;
  }

  export default OSS;
}
