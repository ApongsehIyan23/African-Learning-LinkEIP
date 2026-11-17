export default function Placeholder({ title, description }) {
  return (
    <section className="mx-auto max-w-2xl">
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 sm:p-10 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
          Coming in a later phase
        </p>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-600">{description}</p>
      </div>
    </section>
  )
}
