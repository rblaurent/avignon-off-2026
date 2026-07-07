import { useMemo, useState } from 'react'
import showsData from './shows.json'

type Show = typeof showsData[number]

const PAGE_SIZE = 60

export default function App() {
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [theatreFilter, setTheatreFilter] = useState('')
  const [sortKey, setSortKey] = useState<'coup_coeur'|'name'|'heure'>('coup_coeur')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Show | null>(null)

  const genres = useMemo(() => [...new Set(showsData.map(s => s.genre).filter(Boolean))].sort(), [])
  const theatres = useMemo(() => [...new Set(showsData.map(s => s.theatre_name).filter(Boolean))].sort(), [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let r = showsData as Show[]
    if (q) r = r.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.genre||'').toLowerCase().includes(q) ||
      (s.theatre_name||'').toLowerCase().includes(q) ||
      (s.auteur||'').toLowerCase().includes(q) ||
      (s.content||'').toLowerCase().includes(q)
    )
    if (genreFilter) r = r.filter(s => s.genre === genreFilter)
    if (theatreFilter) r = r.filter(s => s.theatre_name === theatreFilter)
    if (sortKey === 'coup_coeur') r = [...r].sort((a,b) => (b.coup_coeur||0)-(a.coup_coeur||0))
    else if (sortKey === 'heure') r = [...r].sort((a,b) => (a.heure||'').localeCompare(b.heure||''))
    else r = [...r].sort((a,b) => a.name.localeCompare(b.name))
    return r
  }, [search, genreFilter, theatreFilter, sortKey])

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const visible = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)

  const reset = () => { setSearch(''); setGenreFilter(''); setTheatreFilter(''); setPage(1) }

  return (
    <div className="h-screen flex flex-col bg-[#1a1a20] text-zinc-200">
      <header className="px-4 pt-4 pb-3 border-b border-zinc-800 space-y-2 shrink-0 bg-[#1a1a20]">
        <div className="relative">
          <i className="ph-fill ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1)}}
            placeholder="Rechercher titre, genre, théâtre, auteur…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"/>
          {search && <button onClick={()=>setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">✕</button>}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={genreFilter} onChange={e=>{setGenreFilter(e.target.value);setPage(1)}}
            className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-300">
            <option value="">Tous les genres</option>
            {genres.map(g=> <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={theatreFilter} onChange={e=>{setTheatreFilter(e.target.value);setPage(1)}}
            className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-300 max-w-[220px]">
            <option value="">Tous les théâtres</option>
            {theatres.map(t=> <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex items-center gap-1 ml-auto text-xs">
            <span className="text-zinc-500">Trier :</span>
            {(['coup_coeur','name','heure'] as const).map(k =>
              <button key={k} onClick={()=>{setSortKey(k);setPage(1)}}
                className={`px-2 py-1 rounded ${sortKey===k ? 'bg-orange-500/15 text-orange-400 font-medium':'text-zinc-400 hover:bg-zinc-800'}`}>
                {k==='coup_coeur'?'♥ Coup de cœur':k==='name'?'Nom A→Z':'Heure'}
              </button>)}
          </div>
          {(search||genreFilter||theatreFilter) && <button onClick={reset} className="text-xs text-zinc-500 hover:text-zinc-300 ml-1">Réinitialiser</button>}
        </div>
        <div className="text-xs text-zinc-500">
          {filtered.length} résultat{filtered.length>1?'s':''} sur {showsData.length}
          {pageCount>1 && ` — page ${page}/${pageCount}`}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {filtered.length===0 ? <div className="text-zinc-500 text-center mt-20">Aucun spectacle trouvé</div> :
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-7xl mx-auto">
          {visible.map(s=>(
            <button key={s.id} onClick={()=>setSelected(s)}
              className="text-left rounded-lg border border-zinc-800 overflow-hidden hover:border-zinc-700 hover:bg-zinc-800/40 transition-all flex gap-0">
              <div className="shrink-0 w-20 bg-zinc-800">
                {s.header_image ? <img src={s.header_image} alt={s.name} className="w-20 h-full object-cover" style={{minHeight:100}} loading="lazy"/> :
                  <div className="w-20 flex items-center justify-center" style={{minHeight:100}}>🎭</div>}
              </div>
              <div className="flex-1 min-w-0 p-2.5">
                <div className="flex items-start justify-between gap-1 mb-1">
                  <p className="text-xs font-semibold leading-snug line-clamp-2">{s.name}</p>
                  {s.coup_coeur>0 && <span className="shrink-0 text-[10px] text-amber-500">♥ {s.coup_coeur}</span>}
                </div>
                {s.genre && <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded mb-1 inline-block text-zinc-400">{s.genre}</span>}
                {s.theatre_name && <p className="text-[10px] text-zinc-400 truncate">{s.theatre_name}{s.salle?` · ${s.salle}`:''}</p>}
                <p className="text-[10px] text-zinc-500">{[s.heure,s.duration,s.dates].filter(Boolean).join(' · ')}</p>
              </div>
            </button>
          ))}
        </div>}
        {pageCount>1 && <div className="flex justify-center gap-2 mt-6 text-xs">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1} className="px-3 py-1.5 rounded border border-zinc-700 disabled:opacity-40">← Précédent</button>
          <span className="px-2 py-1.5 text-zinc-400">{page} / {pageCount}</span>
          <button onClick={()=>setPage(p=>Math.min(pageCount,p+1))} disabled={page>=pageCount} className="px-3 py-1.5 rounded border border-zinc-700 disabled:opacity-40">Suivant →</button>
        </div>}
      </main>

      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={()=>setSelected(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-5" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-start gap-4 mb-3">
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <button onClick={()=>setSelected(null)} className="text-zinc-500 hover:text-zinc-200">✕</button>
            </div>
            {selected.header_image && <img src={selected.header_image} className="rounded mb-3 max-h-56 object-cover w-full" />}
            <p className="text-sm text-zinc-300 mb-3 whitespace-pre-wrap">{selected.content}</p>
            <div className="text-xs text-zinc-400 space-y-1">
              {selected.auteur && <div><b>Auteur :</b> {selected.auteur}</div>}
              {selected.equipe && <div><b>Équipe :</b> {selected.equipe}</div>}
              <div><b>Lieu :</b> {selected.theatre_name} {selected.salle && `· ${selected.salle}`}</div>
              <div><b>Horaire :</b> {selected.heure} · {selected.duration} · {selected.dates}{selected.relache && ` · relâche ${selected.relache}`}</div>
              {selected.tarifs && <div><b>Tarifs :</b> {selected.tarifs}</div>}
              {selected.accessibility && <div><b>Accessibilité :</b> {selected.accessibility}</div>}
            </div>
            {selected.off_url && <a href={selected.off_url} target="_blank" className="inline-block mt-4 text-orange-400 text-sm hover:underline">Voir sur festivaloffavignon.com →</a>}
          </div>
        </div>
      )}
      <footer className="text-center text-[11px] text-zinc-600 py-2 border-t border-zinc-800">Avignon Off 2026 — 1908 spectacles · export statique</footer>
    </div>
  )
}
