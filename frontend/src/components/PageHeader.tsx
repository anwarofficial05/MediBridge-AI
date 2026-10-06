export default function PageHeader({ eyebrow, title, text, action }: { eyebrow?: string; title: string; text?: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow&&<div className="mb-1 text-xs font-bold uppercase tracking-[.18em] text-cyan-700">{eyebrow}</div>}<h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>{text&&<p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{text}</p>}</div>{action}</div>;
}
