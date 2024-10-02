import { Context, Hono } from 'hono';

export interface Bindings {
    MALACCA: AnalyticsEngineDataset,
    MALACCA_USER: KVNamespace,
    MALACCA_CACHE: KVNamespace,
    MY_RATE_LIMITER: RateLimit,
}

export interface AIProvider {
    name: string;
    handleRequest: (c: Context) => Promise<Response>;
    getModelName: (c: Context) => string;
    getTokenCount: (c: Context) => {input_tokens: number, output_tokens: number};
    basePath: string;
    route: Hono;
}
