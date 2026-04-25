import type { DecisionTone } from '@/lib/demo-data'

const toneClasses: Record<DecisionTone, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
  info: 'bg-sky-400',
}

export function DecisionCard({
  label,
  status,
  reason,
  tone,
}: {
  label: string
  status: string
  reason: string
  tone: DecisionTone
}) {
  return (
    <article className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="space-y-1">
        <div className="text-sm text-slate-400">{label}</div>
        <div className="text-lg font-semibold tracking-[-0.03em] text-white">{status}</div>
        <div className="text-sm leading-6 text-slate-400">{reason}</div>
      </div>

      <span aria-hidden="true" className={`mt-2 h-3 w-3 shrink-0 rounded-full ${toneClasses[tone]}`} />
    </article>
  )
}
