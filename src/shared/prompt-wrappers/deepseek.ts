import { BasePromptWrapper, GetPromptOptions } from './base'

// DeepSeek V2/V3 prompt format
// Optimized for reasoning and coding tasks
export class DeepSeekPromptWrapper extends BasePromptWrapper {
  getPrompt({ systemPrompt, messages }: GetPromptOptions): string {
    let prompt = ''

    // DeepSeek uses a simple format with special tokens
    if (systemPrompt) {
      prompt += `<|begin_of_sentence|>${systemPrompt}

`
    }

    messages.forEach(({ role, message }) => {
      if (role === 'user') {
        prompt += `User: ${message}

`
      } else {
        prompt += `Assistant: ${message}

`
      }
    })

    // End with Assistant: to prompt response
    prompt += `Assistant:`

    return prompt
  }
}
