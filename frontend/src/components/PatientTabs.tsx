import { Link, useLocation } from 'react-router-dom';
const tabs = [
  ['Overview',''],['Timeline','/timeline'],['Medical Graph','/graph'],['Voice Sessions','?tab=voice'],['Documents','?tab=documents'],['Consultations','?tab=consultations'],['Medications','?tab=medications'],['Lab Results','?tab=labs'],['AI Summary','/summary']
];
export default function PatientTabs({id}:{id:string}){const loc=useLocation();return <div className="mb-6 overflow-x-auto"><div className="flex min-w-max gap-1 rounded-2xl border border-slate-200 bg-white p-1.5">{tabs.map(([label,suffix])=>{const target=`/patients/${id}${suffix}`;const base=`/patients/${id}`;const active=suffix.startsWith('?')?loc.pathname===base&&loc.search===suffix:suffix===''?loc.pathname===base&&!loc.search:loc.pathname===target;return <Link key={label} to={target} className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${active?'bg-cyan-700 text-white':'text-slate-600 hover:bg-slate-50'}`}>{label}</Link>})}</div></div>}
