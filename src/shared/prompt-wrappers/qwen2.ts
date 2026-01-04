import { BasePromptWrapper, GetPromptOptions } from './base'

// Qwen 2/2.5 prompt format (ChatML-based)
// Supports 128K context and excellent multilingual
export class Qwen2PromptWrapper extends BasePromptWrapper {
  getPrompt({ systemPrompt, messages }: GetPromptOptions): string {
    let prompt = `<|im_start|>system
${systemPrompt}<|im_end|>
`

    messages.forEach(({ role, message }) => {
      if (role === 'user') {
        prompt += `<|im_start|>user
${message}<|im_end|>
`
      } else {
        prompt += `<|im_start|>assistant
${message}<|im_end|>
`
      }
    })

    // End with assistant tag to prompt response
    prompt += `<|im_start|>assistant
`

    return prompt
  }
}
