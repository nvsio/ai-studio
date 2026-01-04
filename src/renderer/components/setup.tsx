import { Model, MODELS, getModelsForMemory, getRecommendedModels } from '@shared/model-list'
import { LucideCheck, LucideDownload, LucideLoader2, LucideStar, LucideZap } from 'lucide-react'
import prettyBytes from 'pretty-bytes'
import { useState, useMemo, useEffect } from 'react'
import { useValue } from 'signia-react'

import AuditIcon from '@/assets/icons/audit.svg'
import MagicCommandIcon from '@/assets/icons/magic-command.svg'
import OfflineIcon from '@/assets/icons/offline.svg'
import PageIcon from '@/assets/icons/page.svg'
import LogoLight from '@/assets/logo-light.svg'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useModelManager } from '@/providers/models/manager'

import { cn } from '@/lib/utils'

type SetupStep = 'welcome' | 'pick-model' | 'downloading'

export function Setup({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<SetupStep>('welcome')
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [selectedFileIdx, setSelectedFileIdx] = useState(0)
  const [systemMemoryGB, setSystemMemoryGB] = useState(16)

  const modelManager = useModelManager()

  // Get system memory from main process
  useEffect(() => {
    window.system?.getHardwareInfo?.().then((info) => {
      if (info?.totalMemoryGB) {
        setSystemMemoryGB(info.totalMemoryGB)
      }
    }).catch(() => {
      // Fallback to 16GB if API not available
      setSystemMemoryGB(16)
    })
  }, [])

  // Filter models based on system memory
  const availableModels = useMemo(() => getModelsForMemory(systemMemoryGB), [systemMemoryGB])
  const recommendedModels = useMemo(() => getRecommendedModels(systemMemoryGB), [systemMemoryGB])

  // Watch download progress
  const downloads = useValue(
    'downloads',
    () => Array.from(modelManager.state.downloads.values()),
    [modelManager],
  )

  const activeDownload = useMemo(() => {
    if (!selectedModel) return null
    const file = selectedModel.files[selectedFileIdx]
    return downloads.find((d) => d.filename === file.name)
  }, [downloads, selectedModel, selectedFileIdx])

  const downloadProgress = useMemo(() => {
    if (!activeDownload || activeDownload.totalBytes === 0) return 0
    return (activeDownload.receivedBytes / activeDownload.totalBytes) * 100
  }, [activeDownload])

  const handleStartDownload = () => {
    if (!selectedModel) return

    const file = selectedModel.files[selectedFileIdx]

    // Start downloading embeddings model
    window.embeddings.loadModel('Xenova/bge-large-en-v1.5')

    // Create a hidden anchor to trigger download
    const anchor = document.createElement('a')
    anchor.href = file.url
    anchor.download = file.name
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)

    // Download supporting files (e.g., vision model projector)
    if (file.supportingFiles) {
      file.supportingFiles.forEach((supportingFile) => {
        const supportAnchor = document.createElement('a')
        supportAnchor.href = supportingFile.url
        supportAnchor.download = supportingFile.name
        document.body.appendChild(supportAnchor)
        setTimeout(() => {
          supportAnchor.click()
          document.body.removeChild(supportAnchor)
        }, 500)
      })
    }

    setStep('downloading')

    // Watch for completion
    const removeHandler = modelManager.onDownloadComplete(() => {
      removeHandler()
      onComplete()
    })
  }

  if (step === 'welcome') {
    return (
      <WelcomeStep
        onContinue={() => setStep('pick-model')}
        systemMemoryGB={systemMemoryGB}
      />
    )
  }

  if (step === 'pick-model') {
    return (
      <ModelPickerStep
        models={availableModels}
        recommendedModels={recommendedModels}
        selectedModel={selectedModel}
        selectedFileIdx={selectedFileIdx}
        onSelectModel={(model, fileIdx) => {
          setSelectedModel(model)
          setSelectedFileIdx(fileIdx)
        }}
        onBack={() => setStep('welcome')}
        onDownload={handleStartDownload}
        systemMemoryGB={systemMemoryGB}
      />
    )
  }

  // Downloading step
  return (
    <DownloadingStep
      model={selectedModel!}
      fileIdx={selectedFileIdx}
      progress={downloadProgress}
      receivedBytes={activeDownload?.receivedBytes ?? 0}
    />
  )
}

function WelcomeStep({
  onContinue,
  systemMemoryGB,
}: {
  onContinue: () => void
  systemMemoryGB: number
}) {
  return (
    <div className="h-[75vh] max-h-[800px] w-full max-w-[1000px] rounded-md border bg-background shadow-md">
      <div className="flex h-full w-full flex-col gap-4 pt-12">
        <div className="flex w-full flex-1 justify-center px-8">
          <img
            src={LogoLight}
            className="w-full max-w-[300px]"
            alt="AI Studio Logo"
            style={{
              imageRendering: '-webkit-optimize-contrast',
            }}
          />
        </div>

        <div className="flex-2 flex flex-col gap-8 overflow-auto p-12 px-24">
          <div className="grid grid-cols-2 justify-around gap-16">
            <InfoGroup
              title="Keep your data private"
              description="Eliminate data residency, compliance, or privacy concerns with every model running on your machine."
              logo={OfflineIcon}
            />
            <InfoGroup
              title="Use one model or every model"
              description="Not every project is the same. Choose from dozens of models and sizes to find the right one."
              logo={AuditIcon}
            />
          </div>
          <div className="grid grid-cols-2 justify-around gap-16">
            <InfoGroup
              title="Chat with any PDF"
              description="Import PDFs into a local database for easy search, recall, and summarization by your model of choice."
              logo={PageIcon}
            />
            <InfoGroup
              title="Generate text, code, JSON, and more"
              description="Chat is just the beginning. Specify code, JSON, and more as output with validation."
              logo={MagicCommandIcon}
            />
          </div>
        </div>
        <div className="w-100 flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LucideZap className="h-4 w-4 text-yellow-500" />
            <span>Detected {systemMemoryGB}GB RAM - {systemMemoryGB >= 64 ? 'Ready for flagship models!' : systemMemoryGB >= 32 ? 'Great for large models!' : 'Perfect for efficient models!'}</span>
          </div>
          <Button size="lg" onClick={onContinue}>
            Choose Your Model
          </Button>
        </div>
      </div>
    </div>
  )
}

function ModelPickerStep({
  models,
  recommendedModels,
  selectedModel,
  selectedFileIdx,
  onSelectModel,
  onBack,
  onDownload,
  systemMemoryGB,
}: {
  models: Model[]
  recommendedModels: Model[]
  selectedModel: Model | null
  selectedFileIdx: number
  onSelectModel: (model: Model, fileIdx: number) => void
  onBack: () => void
  onDownload: () => void
  systemMemoryGB: number
}) {
  // Group models by category
  const groupedModels = useMemo(() => {
    const groups: { title: string; models: Model[] }[] = []

    if (recommendedModels.length > 0) {
      groups.push({ title: 'Recommended for your hardware', models: recommendedModels })
    }

    const flagship = models.filter((m) => (m.minMemoryGB || 0) >= 48 && !m.recommended)
    if (flagship.length > 0) {
      groups.push({ title: 'Flagship Models (70B+)', models: flagship })
    }

    const large = models.filter((m) => {
      const min = m.minMemoryGB || 0
      return min >= 24 && min < 48 && !m.recommended
    })
    if (large.length > 0) {
      groups.push({ title: 'Large Models (30-40B)', models: large })
    }

    const medium = models.filter((m) => {
      const min = m.minMemoryGB || 0
      return min >= 8 && min < 24 && !m.recommended
    })
    if (medium.length > 0) {
      groups.push({ title: 'Medium Models (7-14B)', models: medium })
    }

    const small = models.filter((m) => {
      const min = m.minMemoryGB || 0
      return min < 8 && !m.recommended
    })
    if (small.length > 0) {
      groups.push({ title: 'Fast Models (1-7B)', models: small })
    }

    return groups
  }, [models, recommendedModels])

  const selectedFile = selectedModel?.files[selectedFileIdx]

  return (
    <div className="h-[85vh] max-h-[900px] w-full max-w-[1200px] rounded-md border bg-background shadow-md">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b p-6">
          <h1 className="text-2xl font-bold">Choose a Model</h1>
          <p className="text-sm text-muted-foreground">
            Select a model to download. {systemMemoryGB}GB RAM detected - showing compatible models.
          </p>
        </div>

        {/* Model List */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            {groupedModels.map((group) => (
              <div key={group.title}>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  {group.title.includes('Recommended') && (
                    <LucideStar className="h-5 w-5 text-yellow-500" />
                  )}
                  {group.title}
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {group.models.map((model) => (
                    <ModelCard
                      key={model.name}
                      model={model}
                      isSelected={selectedModel?.name === model.name}
                      selectedFileIdx={selectedModel?.name === model.name ? selectedFileIdx : 0}
                      onSelect={(fileIdx) => onSelectModel(model, fileIdx)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between border-t p-6">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <div className="flex items-center gap-4">
            {selectedModel && selectedFile && (
              <span className="text-sm text-muted-foreground">
                {selectedModel.name} ({selectedFile.quantization}) - {prettyBytes(selectedFile.sizeBytes)}
              </span>
            )}
            <Button
              size="lg"
              disabled={!selectedModel}
              onClick={onDownload}
            >
              <LucideDownload className="mr-2 h-4 w-4" />
              Download & Get Started
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModelCard({
  model,
  isSelected,
  selectedFileIdx,
  onSelect,
}: {
  model: Model
  isSelected: boolean
  selectedFileIdx: number
  onSelect: (fileIdx: number) => void
}) {
  return (
    <div
      className={cn(
        'cursor-pointer rounded-lg border p-4 transition-all hover:border-primary/50',
        isSelected && 'border-primary bg-primary/5 ring-2 ring-primary/20',
      )}
      onClick={() => onSelect(selectedFileIdx)}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{model.name}</h3>
          {model.recommended && (
            <Badge variant="default" className="bg-yellow-500/10 text-yellow-600">
              <LucideStar className="mr-1 h-3 w-3" />
              Recommended
            </Badge>
          )}
        </div>
        {isSelected && (
          <LucideCheck className="h-5 w-5 text-primary" />
        )}
      </div>
      <p className="mb-3 text-sm text-muted-foreground">{model.description}</p>

      {/* Capabilities */}
      {model.capabilities && model.capabilities.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {model.capabilities.map((cap) => (
            <Badge key={cap} variant="outline" className="text-xs">
              {cap}
            </Badge>
          ))}
        </div>
      )}

      {/* File options */}
      <div className="flex flex-wrap gap-2">
        {model.files.map((file, idx) => (
          <button
            key={file.name}
            className={cn(
              'rounded-md border px-2 py-1 text-xs transition-all',
              isSelected && selectedFileIdx === idx
                ? 'border-primary bg-primary text-primary-foreground'
                : 'hover:border-primary/50',
            )}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(idx)
            }}
          >
            {file.quantization} ({prettyBytes(file.sizeBytes)})
          </button>
        ))}
      </div>
    </div>
  )
}

function DownloadingStep({
  model,
  fileIdx,
  progress,
  receivedBytes,
}: {
  model: Model
  fileIdx: number
  progress: number
  receivedBytes: number
}) {
  const file = model.files[fileIdx]

  return (
    <div className="flex h-[75vh] max-h-[800px] w-full max-w-[600px] flex-col items-center justify-center rounded-md border bg-background p-12 shadow-md">
      <LucideLoader2 className="mb-6 h-12 w-12 animate-spin text-primary" />
      <h2 className="mb-2 text-xl font-semibold">Downloading {model.name}</h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        {file.quantization} quantization • {prettyBytes(file.sizeBytes)} total
      </p>

      <div className="w-full max-w-[400px]">
        <Progress value={progress} className="mb-2 h-3" />
        <div className="flex justify-between text-sm">
          <span className="font-medium">{progress.toFixed(1)}%</span>
          <span className="text-muted-foreground">
            {prettyBytes(receivedBytes)} / {prettyBytes(file.sizeBytes)}
          </span>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Also downloading embedding model for document search...
      </p>
    </div>
  )
}

function InfoGroup({
  title,
  description,
  logo,
}: {
  title: string
  description: string
  logo: string
}) {
  return (
    <div className="grid grid-cols-[48px,_1fr] gap-4">
      <img src={logo} alt="Icon" className="w-16" />
      <div className="flex flex-col">
        <span className="text-sm font-bold">{title}</span>
        <span className="text-sm font-light">{description}</span>
      </div>
    </div>
  )
}
