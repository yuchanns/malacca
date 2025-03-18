import { azureDeepseekProvider } from "./azureDeepseek"
import { azureOpenAIProvider } from "./azureOpenAI"
import { workersAIProvider } from "./workersAI"
import { deepseekProvider } from "./deepseek"
import { openaiProvider } from "./openai"
import { azureAIProvider } from "./azureAI"
export const providers = {
	"azure-openai": azureOpenAIProvider,
	"workers-ai": workersAIProvider,
	"deepseek": deepseekProvider,
	"openai": openaiProvider,
	"azure-deepseek": azureDeepseekProvider,
	"azure-ai": azureAIProvider,
}
