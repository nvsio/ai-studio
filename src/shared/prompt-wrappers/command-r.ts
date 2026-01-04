import { BasePromptWrapper, GetPromptOptions } from './base'

// Command R/R+ prompt format (Cohere)
// Optimized for RAG and tool use
export class CommandRPromptWrapper extends BasePromptWrapper {
  getPrompt({ systemPrompt, messages }: GetPromptOptions): string {
    let prompt = ''

    // Command R uses a preamble for system prompt
    if (systemPrompt) {
      prompt += `<|START_OF_TURN_TOKEN|><|SYSTEM_TOKEN|>${systemPrompt}<|END_OF_TURN_TOKEN|>`
    }

    messages.forEach(({ role, message }) => {
      if (role === 'user') {
        prompt += `<|START_OF_TURN_TOKEN|><|USER_TOKEN|>${message}<|END_OF_TURN_TOKEN|>`
      } else {
        prompt += `<|START_OF_TURN_TOKEN|><|CHATBOT_TOKEN|>${message}<|END_OF_TURN_TOKEN|>`
      }
    })

    // End with chatbot token to prompt response
    prompt += `<|START_OF_TURN_TOKEN|><|CHATBOT_TOKEN|>`

    return prompt
  }
}
