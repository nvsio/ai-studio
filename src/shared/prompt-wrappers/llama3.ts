import { BasePromptWrapper, GetPromptOptions } from './base'

// Llama 3/3.1/3.2/3.3 prompt format
// Uses special tokens for chat formatting
export class Llama3PromptWrapper extends BasePromptWrapper {
  getPrompt({ systemPrompt, messages }: GetPromptOptions): string {
    let prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

${systemPrompt}<|eot_id|>`

    messages.forEach(({ role, message }) => {
      if (role === 'user') {
        prompt += `<|start_header_id|>user<|end_header_id|}

${message}<|eot_id|>`
      } else {
        prompt += `<|start_header_id|>assistant<|end_header_id|>

${message}<|eot_id|>`
      }
    })

    // End with assistant header to prompt response
    prompt += `<|start_header_id|>assistant<|end_header_id|>

`

    return prompt
  }
}
