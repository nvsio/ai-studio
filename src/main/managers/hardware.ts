import { execSync } from 'child_process'
import { cpus, totalmem, freemem, arch, platform } from 'os'

export type AppleSiliconGeneration = 'M1' | 'M2' | 'M3' | 'M4' | 'unknown'
export type AppleSiliconVariant = 'base' | 'Pro' | 'Max' | 'Ultra' | 'unknown'

export interface HardwareProfile {
  // CPU Info
  cpuModel: string
  cpuCores: number
  performanceCores: number
  efficiencyCores: number

  // Apple Silicon specific
  isAppleSilicon: boolean
  generation: AppleSiliconGeneration
  variant: AppleSiliconVariant
  gpuCores: number
  neuralEngineCores: number

  // Memory
  totalMemoryGB: number
  availableMemoryGB: number
  unifiedMemory: boolean

  // Optimal settings
  recommended: {
    gpuLayers: number
    cpuThreads: number
    contextSize: number
    maxModelSizeGB: number
    batchSize: number
  }
}

// Known Apple Silicon GPU core counts
const GPU_CORES: Record<string, Record<string, number>> = {
  M1: { base: 8, Pro: 16, Max: 32, Ultra: 64 },
  M2: { base: 10, Pro: 19, Max: 38, Ultra: 76 },
  M3: { base: 10, Pro: 18, Max: 40, Ultra: 80 },
  M4: { base: 10, Pro: 20, Max: 40, Ultra: 80 },
}

// Neural Engine cores per generation
const NEURAL_CORES: Record<string, number> = {
  M1: 16,
  M2: 16,
  M3: 16,
  M4: 16,
}

function getMacOSVersion(): { major: number; minor: number; patch: number } | null {
  if (platform() !== 'darwin') return null

  try {
    const version = execSync('sw_vers -productVersion', { encoding: 'utf-8' }).trim()
    const [major, minor, patch] = version.split('.').map(Number)
    return { major, minor: minor || 0, patch: patch || 0 }
  } catch {
    return null
  }
}

function getAppleSiliconInfo(): {
  generation: AppleSiliconGeneration
  variant: AppleSiliconVariant
  gpuCores: number
  neuralEngineCores: number
} {
  if (platform() !== 'darwin' || arch() !== 'arm64') {
    return { generation: 'unknown', variant: 'unknown', gpuCores: 0, neuralEngineCores: 0 }
  }

  try {
    const cpuBrand = execSync('sysctl -n machdep.cpu.brand_string', { encoding: 'utf-8' }).trim()

    // Parse the chip name (e.g., "Apple M4 Max")
    const match = cpuBrand.match(/Apple (M\d+)(?:\s+(Pro|Max|Ultra))?/)
    if (!match) {
      return { generation: 'unknown', variant: 'unknown', gpuCores: 0, neuralEngineCores: 0 }
    }

    const generation = match[1] as AppleSiliconGeneration
    const variant = (match[2] || 'base') as AppleSiliconVariant

    const gpuCores = GPU_CORES[generation]?.[variant] || 0
    const neuralEngineCores = NEURAL_CORES[generation] || 0

    return { generation, variant, gpuCores, neuralEngineCores }
  } catch {
    return { generation: 'unknown', variant: 'unknown', gpuCores: 0, neuralEngineCores: 0 }
  }
}

function getPerformanceAndEfficiencyCores(): { performance: number; efficiency: number } {
  if (platform() !== 'darwin') {
    return { performance: cpus().length, efficiency: 0 }
  }

  try {
    const perfCores = parseInt(
      execSync('sysctl -n hw.perflevel0.physicalcpu', { encoding: 'utf-8' }).trim(),
      10
    )
    const effCores = parseInt(
      execSync('sysctl -n hw.perflevel1.physicalcpu', { encoding: 'utf-8' }).trim(),
      10
    )
    return { performance: perfCores || 0, efficiency: effCores || 0 }
  } catch {
    return { performance: Math.floor(cpus().length / 2), efficiency: Math.floor(cpus().length / 2) }
  }
}

function calculateOptimalSettings(
  totalMemoryGB: number,
  _gpuCores: number, // Used for future optimizations
  performanceCores: number,
  generation: AppleSiliconGeneration,
  variant: AppleSiliconVariant
): HardwareProfile['recommended'] {
  // M4 Max with 128GB RAM - optimal settings
  const isHighEnd = variant === 'Max' || variant === 'Ultra'
  const isM4Generation = generation === 'M4'

  // GPU Layers: More unified memory = more layers we can offload
  // M4 Max with 128GB can handle all layers of even 70B models
  let gpuLayers: number
  if (totalMemoryGB >= 128) {
    gpuLayers = 99 // Offload everything to GPU for maximum performance
  } else if (totalMemoryGB >= 96) {
    gpuLayers = 80
  } else if (totalMemoryGB >= 64) {
    gpuLayers = 60
  } else if (totalMemoryGB >= 32) {
    gpuLayers = 40
  } else if (totalMemoryGB >= 16) {
    gpuLayers = 20
  } else {
    gpuLayers = 4 // Fallback for lower memory
  }

  // CPU Threads: Use performance cores primarily
  // Leave some headroom for the system
  const cpuThreads = Math.max(4, performanceCores - 2)

  // Context Size: Scale with available memory
  // M4 Max 128GB can handle massive context windows
  let contextSize: number
  if (totalMemoryGB >= 128) {
    contextSize = 131072 // 128K context for massive RAM
  } else if (totalMemoryGB >= 96) {
    contextSize = 65536 // 64K context
  } else if (totalMemoryGB >= 64) {
    contextSize = 32768 // 32K context
  } else if (totalMemoryGB >= 32) {
    contextSize = 16384 // 16K context
  } else if (totalMemoryGB >= 16) {
    contextSize = 8192 // 8K context
  } else {
    contextSize = 4096 // Default
  }

  // Max model size: roughly 60% of available RAM for the model
  const maxModelSizeGB = Math.floor(totalMemoryGB * 0.6)

  // Batch size: larger batches for faster throughput on high-end systems
  let batchSize: number
  if (isHighEnd && isM4Generation) {
    batchSize = 2048
  } else if (isHighEnd) {
    batchSize = 1024
  } else {
    batchSize = 512
  }

  return {
    gpuLayers,
    cpuThreads,
    contextSize,
    maxModelSizeGB,
    batchSize,
  }
}

export function detectHardware(): HardwareProfile {
  const totalMemoryBytes = totalmem()
  const freeMemoryBytes = freemem()
  const totalMemoryGB = Math.round(totalMemoryBytes / (1024 ** 3))
  const availableMemoryGB = Math.round(freeMemoryBytes / (1024 ** 3))

  const cpuList = cpus()
  const cpuModel = cpuList[0]?.model || 'Unknown'
  const cpuCores = cpuList.length

  const isAppleSilicon = platform() === 'darwin' && arch() === 'arm64'
  const { generation, variant, gpuCores, neuralEngineCores } = getAppleSiliconInfo()
  const { performance: performanceCores, efficiency: efficiencyCores } = getPerformanceAndEfficiencyCores()

  const recommended = calculateOptimalSettings(
    totalMemoryGB,
    gpuCores,
    performanceCores,
    generation,
    variant
  )

  return {
    cpuModel,
    cpuCores,
    performanceCores,
    efficiencyCores,
    isAppleSilicon,
    generation,
    variant,
    gpuCores,
    neuralEngineCores,
    totalMemoryGB,
    availableMemoryGB,
    unifiedMemory: isAppleSilicon, // All Apple Silicon uses unified memory
    recommended,
  }
}

export function getHardwareSummary(): string {
  const hw = detectHardware()

  if (hw.isAppleSilicon) {
    return `Apple ${hw.generation} ${hw.variant === 'base' ? '' : hw.variant} | ${hw.totalMemoryGB}GB RAM | ${hw.gpuCores} GPU cores`
  }

  return `${hw.cpuModel} | ${hw.totalMemoryGB}GB RAM | ${hw.cpuCores} cores`
}

export class HardwareManager {
  private profile: HardwareProfile | null = null

  getProfile(): HardwareProfile {
    if (!this.profile) {
      this.profile = detectHardware()
    }
    return this.profile
  }

  refresh(): HardwareProfile {
    this.profile = detectHardware()
    return this.profile
  }

  // Check if hardware can run a model of given size (in bytes)
  canRunModel(modelSizeBytes: number): boolean {
    const profile = this.getProfile()
    const modelSizeGB = modelSizeBytes / (1024 ** 3)
    return modelSizeGB <= profile.recommended.maxModelSizeGB
  }

  // Get recommended model quantization based on available memory
  getRecommendedQuantization(modelParametersB: number): string {
    const profile = this.getProfile()
    const availableGB = profile.recommended.maxModelSizeGB

    // Rough estimates of model sizes per quantization
    // Model memory ≈ parameters * bytes_per_param
    // Q8_0 ≈ 1 byte/param, Q5_K_M ≈ 0.625 bytes/param, Q4_K_M ≈ 0.5 bytes/param

    const q8Size = modelParametersB * 1
    const q5Size = modelParametersB * 0.625
    const q4Size = modelParametersB * 0.5

    if (q8Size <= availableGB) return 'Q8_0'
    if (q5Size <= availableGB) return 'Q5_K_M'
    if (q4Size <= availableGB) return 'Q4_K_M'

    return 'Q4_K_S' // Smallest available
  }

  // Check macOS version for feature availability
  getMacOSVersion(): { major: number; minor: number; patch: number } | null {
    return getMacOSVersion()
  }

  supportsSequoia(): boolean {
    const version = this.getMacOSVersion()
    return version !== null && version.major >= 15
  }
}

export const hardwareManager = new HardwareManager()
