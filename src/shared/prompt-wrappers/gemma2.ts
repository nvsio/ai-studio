import { BasePromptWrapper, GetPromptOptions } from './base'

// Gemma 2 prompt format
// Google's efficient model format
export class Gemma2PromptWrapper extends BasePromptWrapper {
  getPrompt({ systemPrompt, messages }: GetPromptOptions): string {
    let prompt = ''

    // Gemma 2 uses turn-based format
    if (systemPrompt) {
      prompt += `<start_of_turn>user
${systemPrompt}<end_of_turn>
<start_of_turn>model
I understand. I'll follow these instructions.<end_of_turn>
`
    }

    messages.forEach(({ role, message }) => {
      if (role === 'user') {
        prompt += `<start_of_turn>user
${message}<end_of_turn>
`
      } else {
        prompt += `<start_of_turn>model
${message}<end_of_turn>
`
      }
    })

    // End with model turn to prompt response
    prompt += `<start_of_turn>model
`

    return prompt
  }
}
