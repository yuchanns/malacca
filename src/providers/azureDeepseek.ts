import { Hono, Context, Next } from "hono"
import { AIProvider } from "../types"
import {
	metricsMiddleware,
	bufferMiddleware,
	loggingMiddleware,
	virtualKeyMiddleware,
	guardMiddleware,
	preflightMiddleware,
} from "../middlewares"

const BasePath = "/azure-deepseek/:resource_name/:area"
const ProviderName = "azure-deepseek"
const azureDeepseekRoute = new Hono()

const initMiddleware = async (c: Context, next: Next) => {
	c.set("endpoint", ProviderName)
	c.set("getModelName", getModelName)
	c.set("getTokenCount", getTokenCount)
	c.set("getVirtualKey", getVirtualKey)
	await next()
}

azureDeepseekRoute.use(
	initMiddleware,
	metricsMiddleware,
	loggingMiddleware,
	preflightMiddleware,
	bufferMiddleware,
	virtualKeyMiddleware,
	guardMiddleware,
)

azureDeepseekRoute.post("/*", async (c: Context) => {
	return azureDeepseekProvider.handleRequest(c)
})

azureDeepseekRoute.get("/*", async (c: Context) => {
	const resourceName = c.req.param("resource_name") || ""
	const area = c.req.param("area") || ""
	const functionName = c.req.path.slice(`/azure-deepseek/${resourceName}/${area}/`.length)
	const deepseekEndpoint = `https://${resourceName}.${area}.models.ai.azure.com/${functionName}`
	return c.text(`DeepSeek endpoint on Malacca. Endpoint: ${deepseekEndpoint}`, 200, { "Content-Type": "text/plain" })
})

export const azureDeepseekProvider: AIProvider = {
	name: ProviderName,
	basePath: BasePath,
	route: azureDeepseekRoute,
	getModelName: getModelName,
	getTokenCount: getTokenCount,
	handleRequest: async (c: Context) => {
		const resourceName = c.req.param("resource_name") || ""
		const area = c.req.param("area") || ""
		const functionName = c.req.path.slice(`/azure-deepseek/${resourceName}/${area}/`.length)
		const deepseekEndpoint = `https://${resourceName}.${area}.models.ai.azure.com/${functionName}`

		const headers = new Headers(c.req.header())
		if (c.get("middlewares")?.includes("virtualKey")) {
			const apiKey: string = c.get("realKey")
			if (apiKey) {
				headers.set("Authorization", `Bearer ${apiKey}`)
			}
		}

		const response = await fetch(deepseekEndpoint, {
			method: c.req.method,
			body: JSON.stringify(await c.req.json()),
			headers: headers
		})

		return response
	}
}

function getModelName(c: Context): string {
	const body = c.get("reqBuffer") || "{}"
	const model = JSON.parse(body).model
	return model || "unknown"
}

function getTokenCount(c: Context): { input_tokens: number, output_tokens: number } {
	const buf = c.get("buffer") || ""
	if (c.res.status === 200) {
		if (c.res.headers.get("content-type") === "application/json") {
			try {
				const jsonResponse = JSON.parse(buf)
				const usage = jsonResponse.usage
				if (usage) {
					return {
						input_tokens: usage.prompt_tokens || 0,
						output_tokens: usage.completion_tokens || 0
					}
				}
			} catch (error) {
				console.error("Error parsing response:", error)
			}
		}
		else {
			const output = buf.trim().split("\n\n").at(-2)
			if (output && output.startsWith("data: ")) {
				const usage_message = JSON.parse(output.slice("data: ".length))
				if ("usage" in usage_message) {
					return {
						input_tokens: usage_message.usage.prompt_tokens || 0,
						output_tokens: usage_message.usage.completion_tokens || 0
					}
				}
				return { input_tokens: 0, output_tokens: 0 }
			}
		}
	}
	return { input_tokens: 0, output_tokens: 0 }
}

function getVirtualKey(c: Context): string {
	const authHeader = c.req.header("api-key") || c.req.header("Authorization") || ""
	return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
}

