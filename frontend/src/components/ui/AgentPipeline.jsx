import React from 'react'
import { Cpu, FileText, CheckCircle2, Award, Clock, ArrowRight, Check, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

const DEFAULT_AGENTS = [
  {
    id: 'computational',
    name: 'Computation Agent',
    role: 'ML Inference & Diversity',
    description: 'XGBoost, TreeSHAP, Shannon, Simpson, Bray-Curtis metrics',
    icon: Cpu,
  },
  {
    id: 'summarization',
    name: 'Summarization Agent',
    role: 'Evidence Synthesis',
    description: '10-stage clinical reasoning checkpoints & literature grounding',
    icon: FileText,
  },
  {
    id: 'classification',
    name: 'Classification Agent',
    role: 'Multi-Criteria Decision',
    description: '10-stage decision checkpoints & edge-case validation',
    icon: CheckCircle2,
  },
  {
    id: 'consensus',
    name: 'Diagnostic Consensus',
    role: 'Final Verification',
    description: 'Calibrated consensus risk score & patient report dossier',
    icon: Award,
  },
]

export default function AgentPipeline({
  agents = DEFAULT_AGENTS,
  currentStage = 'computational',
  stageStatuses = {}, // e.g. { computational: 'complete', summarization: 'running', ... }
  onSelectStage,
  interactive = false,
  className = '',
}) {
  return (
    <div className={clsx('w-full', className)}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
        {agents.map((agent, index) => {
          const Icon = agent.icon || Cpu
          const status = stageStatuses[agent.id] || (
            agent.id === currentStage ? 'running' : 'idle'
          )
          const isCurrent = agent.id === currentStage
          const isComplete = status === 'complete'
          const isRunning = status === 'running'
          const isError = status === 'error'

          return (
            <div
              key={agent.id}
              onClick={() => interactive && onSelectStage && onSelectStage(agent.id, index)}
              className={clsx(
                'card p-4 transition-all duration-200 relative overflow-hidden flex flex-col justify-between',
                interactive && 'cursor-pointer hover:border-accent-500/60 hover:-translate-y-0.5',
                isCurrent && 'border-accent-500 bg-accent-500/10 shadow-md ring-1 ring-accent-500/30',
                isComplete && 'border-success-500/40 bg-surface-800/80',
                !isCurrent && !isComplete && 'border-surface-700/60 bg-surface-900/40 opacity-80',
              )}
            >
              {/* Top Row: Index + Status badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-surface-400">
                  STAGE 0{index + 1}
                </span>
                <div>
                  {isComplete ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success-500 dark:text-success-400 bg-success-500/15 px-2 py-0.5 rounded-full border border-success-500/30">
                      <Check size={10} /> Done
                    </span>
                  ) : isRunning ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent-600 dark:text-accent-400 bg-accent-500/15 px-2 py-0.5 rounded-full border border-accent-500/30 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-ping"></span> Active
                    </span>
                  ) : isError ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-danger-500 bg-danger-500/15 px-2 py-0.5 rounded-full border border-danger-500/30">
                      <AlertTriangle size={10} /> Error
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-surface-500 bg-surface-800 px-2 py-0.5 rounded-full border border-surface-700">
                      <Clock size={10} /> Standby
                    </span>
                  )}
                </div>
              </div>

              {/* Icon & Title */}
              <div className="my-2">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div
                    className={clsx(
                      'p-2 rounded-lg shrink-0 transition-colors',
                      isCurrent ? 'bg-accent-500 text-white shadow-sm' : 'bg-surface-800 text-surface-300 border border-surface-700/60'
                    )}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-surface-50 leading-tight">{agent.name}</h4>
                    <p className="text-[11px] font-medium text-accent-500 dark:text-accent-400">{agent.role}</p>
                  </div>
                </div>
                <p className="text-[11px] text-surface-400 leading-relaxed line-clamp-2 mt-1">
                  {agent.description}
                </p>
              </div>

              {/* Step indicator bar */}
              <div className="mt-3 pt-2 border-t border-surface-700/40 flex items-center justify-between text-[10px]">
                <span className="text-surface-500 font-mono">ADAM Core Agent</span>
                {index < agents.length - 1 && (
                  <ArrowRight size={12} className="text-surface-600 hidden md:block" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
