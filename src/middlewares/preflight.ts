import { Context, MiddlewareHandler, Next } from "hono"
import { AppContext, setMiddlewares } from "."

export const preflightMiddleware: MiddlewareHandler = async (c: Context<AppContext<void>>, next: Next) => {
	setMiddlewares(c, "preflight")
	const method = c.req.method
	if (method === "OPTIONS") {
		return c.newResponse(null, 204, {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "*",
			"Access-Control-Allow-Headers": "*",
			"Access-Control-Max-Age": "86400",
		})
	}
	await next()
}
