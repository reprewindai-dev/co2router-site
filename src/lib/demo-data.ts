export type DecisionTone = 'success' | 'warning' | 'danger' | 'info'

export type DecisionExample = {
  label: string
  status: string
  reason: string
  tone: DecisionTone
}

export const decisionExamples: DecisionExample[] = [
  {
    label: 'Production',
    status: 'Runs now',
    reason: 'Meets policy. Safe to execute.',
    tone: 'success',
  },
  {
    label: 'Staging',
    status: 'Delayed',
    reason: 'Lower priority. Scheduled for later.',
    tone: 'warning',
  },
  {
    label: 'Experiment',
    status: 'Blocked',
    reason: 'Policy rejects this workload.',
    tone: 'danger',
  },
  {
    label: 'Over limit',
    status: 'Blocked',
    reason: 'Exceeds allowed thresholds.',
    tone: 'danger',
  },
  {
    label: 'Approval',
    status: 'Waiting',
    reason: 'Requires human approval.',
    tone: 'info',
  },
]
