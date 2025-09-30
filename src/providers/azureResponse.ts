import { Hono, Context, Next } from "hono"
import { AIProvider } from "../types"
import {
	metricsMiddleware,
	bufferMiddleware,
	loggingMiddleware,
	virtualKeyMiddleware,
	guardMiddleware,
} from "../middlewares"

const BasePath = "/azure-response/:resource_name/openai"
const ProviderName = "azure-response"
const azureResponseRoute = new Hono()

const initMiddleware = async (c: Context, next: Next) => {
	if (!c.get("middlewares")) {
		c.set("middlewares", ["init"])
	} else {
		c.set("middlewares", [...c.get("middlewares"), "init"])
	}
	c.set("endpoint", ProviderName)
	c.set("getModelName", getModelName)
	c.set("getTokenCount", getTokenCount)
	c.set("getVirtualKey", getVirtualKey)
	await next()
}

azureResponseRoute.use(
	initMiddleware,
	metricsMiddleware,
	loggingMiddleware,
	bufferMiddleware,
	virtualKeyMiddleware,
	guardMiddleware,
)

azureResponseRoute.post("/*", async (c: Context) => {
	return azureResponseProvider.handleRequest(c)
})


export const azureResponseProvider: AIProvider = {
	name: ProviderName,
	basePath: BasePath,
	route: azureResponseRoute,
	getModelName: getModelName,
	getTokenCount: getTokenCount,
	handleRequest: async (c: Context) => {
		const resourceName = c.req.param("resource_name") || ""
		const functionName = c.req.path.slice(`/azure-response/${resourceName}/openai/`.length)
		const azureEndpoint = `https://${resourceName}.services.ai.azure.com/openai/${functionName}`

		const headers = new Headers(c.req.header())
		if (c.get("middlewares")?.includes("virtualKey")) {
			const apiKey: string = c.get("realKey")
			if (apiKey) {
				headers.set("api-key", apiKey)
			}
		}
		const response = await fetch(azureEndpoint, {
			method: c.req.method,
			body: JSON.stringify(await c.req.json()),
			headers: headers
		})

		return response
	}
}

function getModelName(c: Context): string {
	if (c.res.status === 200) {
		const buf = c.get("buffer") || ""
		if (c.res.headers.get("content-type") === "application/json") {
			const model = JSON.parse(buf)["model"]
			if (model) {
				return model
			}
		} else {
			const chunks = buf.split("\n\n")
			for (const chunk of chunks) {
				if (chunk.startsWith("data: ")) {
					const jsonStr = chunk.slice(6)
					try {
						const jsonData = JSON.parse(jsonStr)
						if (jsonData.model != "") {
							return jsonData.model
						}
					} catch {
						continue
					}
				}
			}
		}
	}
	return "unknown"
}

function getTokenCount(c: Context): { input_tokens: number, output_tokens: number } {
	const buf = c.get("buffer") || ""
	if (c.res.status === 200) {
		if (c.res.headers.get("content-type") === "application/json") {
			const usage = JSON.parse(buf)["usage"]
			if (usage) {
				const input_tokens = usage["prompt_tokens"] || 0
				const output_tokens = usage["completion_tokens"] || 0
				return { input_tokens, output_tokens }
			}
		} else {
			// For streaming response, azure openai does not return usage in the response body, so we count the words and multiply by 4/3 to get the number of input tokens
			const requestBody = c.get("reqBuffer") || "{}"
			const messages = JSON.stringify(JSON.parse(requestBody).messages)
			const input_tokens = Math.ceil(messages.split(/\s+/).length * 4 / 3)

			// For streaming responses, we count the number of '\n\n' as the number of output tokens
			const output_tokens = buf.split("\n\n").length - 1
			return { input_tokens: input_tokens, output_tokens: output_tokens }
		}
	}
	return { input_tokens: 0, output_tokens: 0 }
}

function getVirtualKey(c: Context): string {
	const authHeader = c.req.header("api-key") || c.req.header("Authorization") || ""
	return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader
}

