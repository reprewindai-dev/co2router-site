const faqs = [
  {
    q: 'Is CO2 Router a dashboard?',
    a: 'No. The site presents the control plane and proof surface, not a reporting layer. Buyers use it to authorize compute before execution and inspect the resulting decision frame.',
  },
  {
    q: 'Does the public site talk to the private engine directly?',
    a: 'No. Public traffic is brokered through ecobe-mvp so the website stays cleanly separated from private execution behavior.',
  },
  {
    q: 'Is assurance fully closed?',
    a: 'Not yet. The product is operational, but assurance remains tied to verified provenance and evidence coverage for every public decision path.',
  },
  {
    q: 'What are the strongest production wedges today?',
    a: 'CI/CD and Kubernetes. Those are the clearest control points for binding policy, proof, and operator authority before workloads run.',
  },
] as const

export default function FaqPage() {
  return (
    <div className="space-y-8 pb-10">
      <section className="surface-card-strong p-8">
        <div className="eyebrow">FAQ</div>
        <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
          Direct answers for buyers and operators.
        </h1>
      </section>

      <section className="grid gap-6">
        {faqs.map((faq) => (
          <div key={faq.q} className="surface-card p-6">
            <div className="text-xl font-semibold text-white">{faq.q}</div>
            <p className="mt-4 text-base leading-7 text-slate-300">{faq.a}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
