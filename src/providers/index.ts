import { azureOpenAIProvider } from './azureOpenAI';
import { workersAIProvider } from './workersAI';
import { deepseekProvider } from './deepseek';

export const providers = {
  'azure-openai': azureOpenAIProvider,
  'workers-ai': workersAIProvider,
  'deepseek': deepseekProvider,
};