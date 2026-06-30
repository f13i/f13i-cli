// Reserved, always-rendered slot for the Phase 2 agent observation layer.
// PRD §8 design requirement: build the visual space + "live system" metaphor
// NOW, even though agent_status is always null in Phase 1. Do not retrofit.

interface Props {
  agentStatus: string | null
  assignedTo: string
}

export function AgentStatusSlot({ agentStatus, assignedTo }: Props) {
  const active = Boolean(agentStatus)

  return (
    <div className="flex h-5 items-center gap-1.5" aria-live="polite">
      {active ? (
        <>
          {/* pulsing core + expanding ring = "work is happening" */}
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute h-2 w-2 rounded-full bg-orange animate-agent-ring" />
            <span className="h-2 w-2 rounded-full bg-orange animate-agent-pulse" />
          </span>
          <span className="truncate text-[10px] font-medium text-orange-soft">
            {assignedTo !== 'unassigned' && assignedTo !== 'farhan'
              ? `${assignedTo}: ${agentStatus}`
              : agentStatus}
          </span>
        </>
      ) : (
        // empty-but-present placeholder keeps card height stable and signals
        // the slot exists for agents to occupy
        <span className="flex items-center gap-1.5 opacity-40">
          <span className="h-1.5 w-1.5 rounded-full border border-neutral-600" />
          <span className="text-[10px] text-neutral-600">no agent</span>
        </span>
      )}
    </div>
  )
}
