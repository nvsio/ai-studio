export type Model = {
  name: string
  description: string
  parameters: string
  promptTemplate:
    | 'general'
    | 'phind'
    | 'llama'
    | 'llama3'
    | 'chatml'
    | 'mistral'
    | 'zephyr'
    | 'openfunctions'
    | 'qwen2'
    | 'deepseek'
    | 'gemma2'
    | 'command-r'
  capabilities?: ('tools' | 'images' | 'code' | 'reasoning' | 'long-context' | 'multilingual')[]
  files: ModelFile[]
  recommended?: boolean // Recommended for current hardware
  minMemoryGB?: number // Minimum memory required
}

export type ModelFile = {
  name: string
  url: string
  format: 'gguf'
  repository: string
  quantization: string
  sizeBytes: number
  multimodal?: boolean
  supportingFiles?: { name: string; url: string }[]
}

// 2026 Model List - Updated for M4 Max with 128GB RAM
// These models leverage the latest architectures and can run efficiently on Apple Silicon
export const MODELS: Model[] = [
  // ===== FLAGSHIP MODELS (70B+) - For M4 Max/Ultra with 64GB+ =====
  {
    name: 'Llama 3.3 70B Instruct',
    description:
      'Meta\'s latest flagship model with exceptional reasoning, coding, and instruction following. Best-in-class performance for local inference.',
    parameters: '70B',
    promptTemplate: 'llama3',
    capabilities: ['tools', 'code', 'reasoning', 'long-context'],
    recommended: true,
    minMemoryGB: 48,
    files: [
      {
        name: 'Llama-3.3-70B-Instruct-Q4_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/Llama-3.3-70B-Instruct-GGUF',
        url: 'https://huggingface.co/bartowski/Llama-3.3-70B-Instruct-GGUF/resolve/main/Llama-3.3-70B-Instruct-Q4_K_M.gguf?download=true',
        quantization: '4-bit',
        sizeBytes: 42521954560,
      },
      {
        name: 'Llama-3.3-70B-Instruct-Q5_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/Llama-3.3-70B-Instruct-GGUF',
        url: 'https://huggingface.co/bartowski/Llama-3.3-70B-Instruct-GGUF/resolve/main/Llama-3.3-70B-Instruct-Q5_K_M.gguf?download=true',
        quantization: '5-bit',
        sizeBytes: 49438072832,
      },
      {
        name: 'Llama-3.3-70B-Instruct-Q8_0.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/Llama-3.3-70B-Instruct-GGUF',
        url: 'https://huggingface.co/bartowski/Llama-3.3-70B-Instruct-GGUF/resolve/main/Llama-3.3-70B-Instruct-Q8_0.gguf?download=true',
        quantization: '8-bit',
        sizeBytes: 74236928000,
      },
    ],
  },
  {
    name: 'Qwen 2.5 72B Instruct',
    description:
      'Alibaba\'s flagship model with exceptional multilingual support and 128K context. Outstanding for coding and complex reasoning.',
    parameters: '72B',
    promptTemplate: 'qwen2',
    capabilities: ['tools', 'code', 'reasoning', 'long-context', 'multilingual'],
    minMemoryGB: 48,
    files: [
      {
        name: 'Qwen2.5-72B-Instruct-Q4_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/Qwen/Qwen2.5-72B-Instruct-GGUF',
        url: 'https://huggingface.co/Qwen/Qwen2.5-72B-Instruct-GGUF/resolve/main/qwen2.5-72b-instruct-q4_k_m.gguf?download=true',
        quantization: '4-bit',
        sizeBytes: 43554136064,
      },
      {
        name: 'Qwen2.5-72B-Instruct-Q5_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/Qwen/Qwen2.5-72B-Instruct-GGUF',
        url: 'https://huggingface.co/Qwen/Qwen2.5-72B-Instruct-GGUF/resolve/main/qwen2.5-72b-instruct-q5_k_m.gguf?download=true',
        quantization: '5-bit',
        sizeBytes: 50623848448,
      },
    ],
  },
  {
    name: 'DeepSeek V3 Lite 70B',
    description:
      'DeepSeek\'s advanced model with mixture-of-experts architecture. Exceptional at reasoning and code generation with efficient inference.',
    parameters: '70B',
    promptTemplate: 'deepseek',
    capabilities: ['tools', 'code', 'reasoning'],
    minMemoryGB: 48,
    files: [
      {
        name: 'deepseek-v3-lite-70b-Q4_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/DeepSeek-V3-Lite-GGUF',
        url: 'https://huggingface.co/bartowski/DeepSeek-V3-Lite-GGUF/resolve/main/DeepSeek-V3-Lite-70B-Q4_K_M.gguf?download=true',
        quantization: '4-bit',
        sizeBytes: 42000000000,
      },
    ],
  },

  // ===== LARGE MODELS (30-40B) - For M4 Pro/Max with 32GB+ =====
  {
    name: 'Qwen 2.5 Coder 32B Instruct',
    description:
      'Alibaba\'s specialized coding model. State-of-the-art code generation, debugging, and explanation. Outperforms GPT-4 on coding benchmarks.',
    parameters: '32B',
    promptTemplate: 'qwen2',
    capabilities: ['code', 'tools'],
    recommended: true,
    minMemoryGB: 24,
    files: [
      {
        name: 'Qwen2.5-Coder-32B-Instruct-Q4_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-GGUF',
        url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-GGUF/resolve/main/qwen2.5-coder-32b-instruct-q4_k_m.gguf?download=true',
        quantization: '4-bit',
        sizeBytes: 19359139840,
      },
      {
        name: 'Qwen2.5-Coder-32B-Instruct-Q5_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-GGUF',
        url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-GGUF/resolve/main/qwen2.5-coder-32b-instruct-q5_k_m.gguf?download=true',
        quantization: '5-bit',
        sizeBytes: 22505267200,
      },
      {
        name: 'Qwen2.5-Coder-32B-Instruct-Q8_0.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-GGUF',
        url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-GGUF/resolve/main/qwen2.5-coder-32b-instruct-q8_0.gguf?download=true',
        quantization: '8-bit',
        sizeBytes: 34627321856,
      },
    ],
  },
  {
    name: 'Command R+ 35B',
    description:
      'Cohere\'s enterprise-grade model with excellent RAG capabilities and tool use. Optimized for business applications.',
    parameters: '35B',
    promptTemplate: 'command-r',
    capabilities: ['tools', 'reasoning', 'multilingual'],
    minMemoryGB: 24,
    files: [
      {
        name: 'c4ai-command-r-plus-Q4_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/c4ai-command-r-plus-GGUF',
        url: 'https://huggingface.co/bartowski/c4ai-command-r-plus-GGUF/resolve/main/c4ai-command-r-plus-Q4_K_M.gguf?download=true',
        quantization: '4-bit',
        sizeBytes: 21000000000,
      },
    ],
  },

  // ===== MEDIUM MODELS (7-14B) - For all Apple Silicon Macs =====
  {
    name: 'Llama 3.2 8B Instruct',
    description:
      'Meta\'s latest efficient model with excellent instruction following. Great balance of speed and capability.',
    parameters: '8B',
    promptTemplate: 'llama3',
    capabilities: ['tools', 'code'],
    recommended: true,
    minMemoryGB: 8,
    files: [
      {
        name: 'Llama-3.2-8B-Instruct-Q4_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/Llama-3.2-8B-Instruct-GGUF',
        url: 'https://huggingface.co/bartowski/Llama-3.2-8B-Instruct-GGUF/resolve/main/Llama-3.2-8B-Instruct-Q4_K_M.gguf?download=true',
        quantization: '4-bit',
        sizeBytes: 4920000000,
      },
      {
        name: 'Llama-3.2-8B-Instruct-Q5_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/Llama-3.2-8B-Instruct-GGUF',
        url: 'https://huggingface.co/bartowski/Llama-3.2-8B-Instruct-GGUF/resolve/main/Llama-3.2-8B-Instruct-Q5_K_M.gguf?download=true',
        quantization: '5-bit',
        sizeBytes: 5730000000,
      },
      {
        name: 'Llama-3.2-8B-Instruct-Q8_0.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/Llama-3.2-8B-Instruct-GGUF',
        url: 'https://huggingface.co/bartowski/Llama-3.2-8B-Instruct-GGUF/resolve/main/Llama-3.2-8B-Instruct-Q8_0.gguf?download=true',
        quantization: '8-bit',
        sizeBytes: 8540000000,
      },
    ],
  },
  {
    name: 'Qwen 2.5 14B Instruct',
    description:
      'Alibaba\'s mid-size model with impressive capabilities. Excellent multilingual support and reasoning.',
    parameters: '14B',
    promptTemplate: 'qwen2',
    capabilities: ['tools', 'code', 'multilingual'],
    minMemoryGB: 12,
    files: [
      {
        name: 'Qwen2.5-14B-Instruct-Q4_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF',
        url: 'https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF/resolve/main/qwen2.5-14b-instruct-q4_k_m.gguf?download=true',
        quantization: '4-bit',
        sizeBytes: 8780000000,
      },
      {
        name: 'Qwen2.5-14B-Instruct-Q5_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF',
        url: 'https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF/resolve/main/qwen2.5-14b-instruct-q5_k_m.gguf?download=true',
        quantization: '5-bit',
        sizeBytes: 10200000000,
      },
    ],
  },
  {
    name: 'Gemma 2 9B Instruct',
    description:
      'Google\'s efficient and capable model with strong reasoning and instruction following.',
    parameters: '9B',
    promptTemplate: 'gemma2',
    capabilities: ['code', 'reasoning'],
    minMemoryGB: 8,
    files: [
      {
        name: 'gemma-2-9b-it-Q4_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/gemma-2-9b-it-GGUF',
        url: 'https://huggingface.co/bartowski/gemma-2-9b-it-GGUF/resolve/main/gemma-2-9b-it-Q4_K_M.gguf?download=true',
        quantization: '4-bit',
        sizeBytes: 5540000000,
      },
      {
        name: 'gemma-2-9b-it-Q5_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/gemma-2-9b-it-GGUF',
        url: 'https://huggingface.co/bartowski/gemma-2-9b-it-GGUF/resolve/main/gemma-2-9b-it-Q5_K_M.gguf?download=true',
        quantization: '5-bit',
        sizeBytes: 6440000000,
      },
    ],
  },
  {
    name: 'Mistral Nemo 12B Instruct',
    description:
      'Mistral\'s efficient 12B model with excellent performance-to-size ratio. Great for general tasks.',
    parameters: '12B',
    promptTemplate: 'mistral',
    capabilities: ['tools', 'code'],
    minMemoryGB: 10,
    files: [
      {
        name: 'Mistral-Nemo-Instruct-2407-Q4_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/Mistral-Nemo-Instruct-2407-GGUF',
        url: 'https://huggingface.co/bartowski/Mistral-Nemo-Instruct-2407-GGUF/resolve/main/Mistral-Nemo-Instruct-2407-Q4_K_M.gguf?download=true',
        quantization: '4-bit',
        sizeBytes: 7300000000,
      },
      {
        name: 'Mistral-Nemo-Instruct-2407-Q5_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/Mistral-Nemo-Instruct-2407-GGUF',
        url: 'https://huggingface.co/bartowski/Mistral-Nemo-Instruct-2407-GGUF/resolve/main/Mistral-Nemo-Instruct-2407-Q5_K_M.gguf?download=true',
        quantization: '5-bit',
        sizeBytes: 8500000000,
      },
    ],
  },

  // ===== SMALL/FAST MODELS (1-7B) - Ultra-fast on all hardware =====
  {
    name: 'Llama 3.2 3B Instruct',
    description:
      'Meta\'s smallest Llama 3 model. Extremely fast responses while maintaining quality. Perfect for quick tasks.',
    parameters: '3B',
    promptTemplate: 'llama3',
    capabilities: ['tools'],
    minMemoryGB: 4,
    files: [
      {
        name: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF',
        url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf?download=true',
        quantization: '4-bit',
        sizeBytes: 2020000000,
      },
      {
        name: 'Llama-3.2-3B-Instruct-Q8_0.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF',
        url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q8_0.gguf?download=true',
        quantization: '8-bit',
        sizeBytes: 3420000000,
      },
    ],
  },
  {
    name: 'Qwen 2.5 7B Instruct',
    description:
      'Alibaba\'s efficient 7B model. Excellent performance with low resource requirements.',
    parameters: '7B',
    promptTemplate: 'qwen2',
    capabilities: ['tools', 'code', 'multilingual'],
    minMemoryGB: 8,
    files: [
      {
        name: 'Qwen2.5-7B-Instruct-Q4_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF',
        url: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf?download=true',
        quantization: '4-bit',
        sizeBytes: 4680000000,
      },
      {
        name: 'Qwen2.5-7B-Instruct-Q5_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF',
        url: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q5_k_m.gguf?download=true',
        quantization: '5-bit',
        sizeBytes: 5450000000,
      },
      {
        name: 'Qwen2.5-7B-Instruct-Q8_0.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF',
        url: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q8_0.gguf?download=true',
        quantization: '8-bit',
        sizeBytes: 8100000000,
      },
    ],
  },

  // ===== VISION/MULTIMODAL MODELS =====
  {
    name: 'Llama 3.2 Vision 11B',
    description:
      'Meta\'s multimodal model capable of understanding images. Analyze photos, diagrams, and documents.',
    parameters: '11B',
    promptTemplate: 'llama3',
    capabilities: ['images', 'reasoning'],
    minMemoryGB: 12,
    files: [
      {
        multimodal: true,
        name: 'Llama-3.2-11B-Vision-Instruct-Q4_K_M.gguf',
        format: 'gguf',
        quantization: '4-bit',
        repository: 'https://huggingface.co/bartowski/Llama-3.2-11B-Vision-Instruct-GGUF',
        url: 'https://huggingface.co/bartowski/Llama-3.2-11B-Vision-Instruct-GGUF/resolve/main/Llama-3.2-11B-Vision-Instruct-Q4_K_M.gguf?download=true',
        sizeBytes: 6600000000,
        supportingFiles: [
          {
            name: 'mmproj-model-f16.gguf',
            url: 'https://huggingface.co/bartowski/Llama-3.2-11B-Vision-Instruct-GGUF/resolve/main/mmproj-Llama-3.2-11B-Vision-Instruct-f16.gguf?download=true',
          },
        ],
      },
    ],
  },
  {
    name: 'Qwen 2.5 VL 7B',
    description:
      'Alibaba\'s vision-language model with strong visual understanding and reasoning capabilities.',
    parameters: '7B',
    promptTemplate: 'qwen2',
    capabilities: ['images', 'reasoning', 'multilingual'],
    minMemoryGB: 10,
    files: [
      {
        multimodal: true,
        name: 'Qwen2-VL-7B-Instruct-Q4_K_M.gguf',
        format: 'gguf',
        quantization: '4-bit',
        repository: 'https://huggingface.co/Qwen/Qwen2-VL-7B-Instruct-GGUF',
        url: 'https://huggingface.co/Qwen/Qwen2-VL-7B-Instruct-GGUF/resolve/main/qwen2-vl-7b-instruct-q4_k_m.gguf?download=true',
        sizeBytes: 5200000000,
        supportingFiles: [
          {
            name: 'mmproj-qwen2-vl-7b-f16.gguf',
            url: 'https://huggingface.co/Qwen/Qwen2-VL-7B-Instruct-GGUF/resolve/main/mmproj-qwen2-vl-7b-f16.gguf?download=true',
          },
        ],
      },
    ],
  },

  // ===== SPECIALIZED CODE MODELS =====
  {
    name: 'Qwen 2.5 Coder 7B Instruct',
    description:
      'Alibaba\'s efficient coding model. Great for code generation, completion, and explanation.',
    parameters: '7B',
    promptTemplate: 'qwen2',
    capabilities: ['code', 'tools'],
    minMemoryGB: 8,
    files: [
      {
        name: 'Qwen2.5-Coder-7B-Instruct-Q4_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF',
        url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf?download=true',
        quantization: '4-bit',
        sizeBytes: 4650000000,
      },
      {
        name: 'Qwen2.5-Coder-7B-Instruct-Q5_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF',
        url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q5_k_m.gguf?download=true',
        quantization: '5-bit',
        sizeBytes: 5400000000,
      },
      {
        name: 'Qwen2.5-Coder-7B-Instruct-Q8_0.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF',
        url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q8_0.gguf?download=true',
        quantization: '8-bit',
        sizeBytes: 8000000000,
      },
    ],
  },
  {
    name: 'DeepSeek Coder V2 16B',
    description:
      'DeepSeek\'s specialized coding model with MoE architecture. Excellent for complex programming tasks.',
    parameters: '16B',
    promptTemplate: 'deepseek',
    capabilities: ['code', 'tools', 'reasoning'],
    minMemoryGB: 12,
    files: [
      {
        name: 'DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/DeepSeek-Coder-V2-Lite-Instruct-GGUF',
        url: 'https://huggingface.co/bartowski/DeepSeek-Coder-V2-Lite-Instruct-GGUF/resolve/main/DeepSeek-Coder-V2-Lite-Instruct-Q4_K_M.gguf?download=true',
        quantization: '4-bit',
        sizeBytes: 9500000000,
      },
    ],
  },

  // ===== LEGACY MODELS (kept for compatibility) =====
  {
    name: 'Mistral 7B Instruct v0.3',
    description:
      'Mistral\'s instruction-tuned model. Fast and capable for general tasks.',
    parameters: '7B',
    promptTemplate: 'mistral',
    minMemoryGB: 8,
    files: [
      {
        name: 'Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF',
        url: 'https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3-Q4_K_M.gguf?download=true',
        quantization: '4-bit',
        sizeBytes: 4370000000,
      },
      {
        name: 'Mistral-7B-Instruct-v0.3-Q5_K_M.gguf',
        format: 'gguf',
        repository: 'https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF',
        url: 'https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3-Q5_K_M.gguf?download=true',
        quantization: '5-bit',
        sizeBytes: 5130000000,
      },
    ],
  },
]

// Helper to filter models by available memory
export function getModelsForMemory(availableMemoryGB: number): Model[] {
  return MODELS.filter((model) => {
    const minRequired = model.minMemoryGB || 8
    return minRequired <= availableMemoryGB * 0.6 // Leave 40% headroom
  })
}

// Helper to get recommended models for hardware
export function getRecommendedModels(availableMemoryGB: number): Model[] {
  return getModelsForMemory(availableMemoryGB).filter((model) => model.recommended)
}

// Default model for first-time users (scales with hardware)
export function getDefaultModel(availableMemoryGB: number): Model {
  if (availableMemoryGB >= 64) {
    return MODELS.find((m) => m.name === 'Llama 3.3 70B Instruct')!
  }
  if (availableMemoryGB >= 32) {
    return MODELS.find((m) => m.name === 'Qwen 2.5 Coder 32B Instruct')!
  }
  return MODELS.find((m) => m.name === 'Llama 3.2 8B Instruct')!
}
