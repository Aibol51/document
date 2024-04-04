export type ResponseCode = 0 | 1 | 600 | 603 | 401 | 403 | 500 | 10005 | 20003;

export type HttpResponse<T = any, C = ResponseCode> = {
  code: C;
  data: T;
  message: string;
  timestamp?: string | number;
  path?: string;
  succeed: boolean;
  result: boolean;
};
export interface RequesterType<P = ResponseCode> {
  get<T = any>(url: string, options?: Record<string, unknown>): Promise<HttpResponse<T, P>>;
  post<T = any>(url: string, options?: Record<string, unknown>): Promise<HttpResponse<T, P>>;
  put<T = any>(url: string, options?: Record<string, unknown>): Promise<HttpResponse<T, P>>;
  delete<T = any>(url: string, options?: Record<string, unknown>): Promise<HttpResponse<T, P>>;
  stream?(url: string, options?: Record<string, unknown>): NodeJS.ReadableStream;
}

export type DefaultResourceOptions = {
  headers: { [header: string]: string };
  timeout: number;
  url: string;
};

export interface BaseResourceOptions {
  oauthToken?: string;
  token?: string;
  jobToken?: string;
  host?: string;
  prefixUrl?: string;
  rejectUnauthorized?: boolean;
  requesterFn?: (resourceOptions: DefaultResourceOptions) => RequesterType;
  timeout?: number;
  profileToken?: string;
  cache?: boolean;
}
export interface request<T, P = ResponseCode> {
  <A = any>(): Promise<HttpResponse<T & A, P>>;
}
export class BaseResource {
  private readonly url: string;
  public readonly requester: RequesterType;
  private readonly timeout: number;
  private readonly headers: { [header: string]: string };
  // private manager:RequestManager;
  constructor({
    host,
    oauthToken,
    prefixUrl,
    requesterFn,
    timeout,
    token,
    cache = true,
  }: BaseResourceOptions) {
    if (!requesterFn) throw new ReferenceError("requesterFn must be passed");
    this.url = [host, prefixUrl].join("/");
    this.headers = {
      "user-agent": "gitbeaker",
    };
    this.timeout = timeout || 10 * 1000;
    if (oauthToken) this.headers.authorization = `Bearer ${oauthToken}`;
    else if (token) this.headers["token"] = token;
    // this.manager=new RequestManager();
    this.requester = requesterFn({ ...(this as any) });
  }
}
