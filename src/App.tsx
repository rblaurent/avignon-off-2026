import { useMemo, useState, useEffect } from 'react'
import showsData from './shows.json'

type Show = typeof showsData[number]
type SlotKey = '12-matin' | '12-aprem' | '12-soir' | '13-matin' | '13-aprem' | '13-soir'
const SLOTS: { key: SlotKey; label: string; minH: number; maxH: number }[] = [
  { key: '12-matin', label: 'Sam 12 · Matin', minH: 0, maxH: 12 },
  { key: '12-aprem', label: 'Sam 12 · Début AM', minH: 13, maxH: 17 },
  { key: '12-soir',  label: 'Sam 12 · Soir', minH: 18, maxH: 99 },
  { key: '13-matin', label: 'Dim 13 · Matin', minH: 0, maxH: 12 },
  { key: '13-aprem', label: 'Dim 13 · Début AM', minH: 13, maxH: 17 },
  { key: '13-soir',  label: 'Dim 13 · Soir', minH: 18, maxH: 99 },
]

function parseHour(h: string | null) {
  if (!h) return null
  const m = h.match(/(\d{1,2})h(\d{0,2})/)
  return m ? parseInt(m[1]) + (parseInt(m[2]||'0')/60) : null
}
function playsOn(show: Show, day: 12|13) {
  const dates = show.dates || ''
  const rel = show.relache || ''
  // crude: "4 au 25 juillet" etc.
  const m = dates.match(/(\d{1,2}).*?(\d{1,2})/)
  if (!m) return true
  const start = parseInt(m[1]), end = parseInt(m[2])
  if (day < start || day > end) return false
  return !rel.includes(String(day))
}
function fitsSlot(show: Show, slot: typeof SLOTS[number]) {
  const h = parseHour(show.heure)
  return h === null || (h >= slot.minH && h <= slot.maxH)
}

export default function App() {
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const [fav, setFav] = useState<string[]>(() => JSON.parse(localStorage.getItem('avignon_fav') || '[]'))
  const [plan, setPlan] = useState<Record<SlotKey, string | null>>(() => JSON.parse(localStorage.getItem('avignon_plan') || '{"12-matin":null,"12-aprem":null,"12-soir":null,"13-matin":null,"13-aprem":null,"13-soir":null}'))
  const [selected, setSelected] = useState<Show | null>(null)
  const [viewFav, setViewFav] = useState(false)

  useEffect(() => { localStorage.setItem('avignon_fav', JSON.stringify(fav)) }, [fav])
  useEffect(() => { localStorage.setItem('avignon_plan', JSON.stringify(plan)) }, [plan])

  const genres = useMemo(() => [...new Set(showsData.map(s => s.genre).filter(Boolean))].sort(), [])

  const filtered = useMemo(() => {
    let r = showsData as Show[]
    if (viewFav) r = r.filter(s => fav.includes(s.id))
    if (onlyAvailable) r = r.filter(s => playsOn(s,12) || playsOn(s,13))
    const q = search.toLowerCase()
    if (q) r = r.filter(s => (s.name + s.genre + s.theatre_name + s.auteur + s.content).toLowerCase().includes(q))
    if (genre) r = r.filter(s => s.genre === genre)
    return r.sort((a,b)=>(b.coup_coeur||0)-(a.coup_coeur||0))
  }, [search, genre, onlyAvailable, viewFav, fav])

  const toggleFav = (id: string) => setFav(f => f.includes(id) ? f.filter(x=>x!==id) : [...f, id])
  const assignSlot = (slot: SlotKey, showId: string | null) => setPlan(p => ({...p, [slot]: showId}))
  const showById = (id: string | null) => showsData.find(s=>s.id===id) || null

  return (
    <div className="min-h-screen bg-[#0f0f14] text-zinc-200 flex">
      {/* main browse */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-[#0f0f14]/90 backdrop-blur border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight">Avignon Off <span className="text-zinc-500 font-normal">2026</span></h1>
            <div className="flex-1 min-w-[240px] relative max-w-xl">
              <i className="ph-fill ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Titre, genre, théâtre, auteur…"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-zinc-600"/>
            </div>
            <select value={genre} onChange={e=>setGenre(e.target.value)}
              className="text-sm bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2">
              <option value="">Tous genres</option>
              {genres.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
            <label className="text-xs text-zinc-400 flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={onlyAvailable} onChange={e=>setOnlyAvailable(e.target.checked)} />
              12-13 juillet uniquement
            </label>
            <button onClick={()=>setViewFav(!viewFav)}
              className={`text-sm px-4 py-2 rounded-full border transition ${viewFav ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>
              ♥ Favoris {fav.length>0 && `(${fav.length})`}
            </button>
          </div>
          <div className="text-xs text-zinc-500 mt-2">{filtered.length} spectacles</div>
        </header>

        <main className="px-6 py-6">
          <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {filtered.slice(0,200).map(s => {
              const isFav = fav.includes(s.id)
              return (
                <div key={s.id} className="group cursor-pointer" onClick={()=>setSelected(s)}>
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 shadow-lg">
                    {s.header_image
                      ? <img src={s.header_image} alt={s.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-300"/>
                      : <div className="w-full h-full flex items-center justify-center text-zinc-600">🎭</div>}
                    <button onClick={e=>{e.stopPropagation();toggleFav(s.id)}}
                      className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur transition ${isFav ? 'bg-rose-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}>♥</button>
                    {s.coup_coeur>0 && <div className="absolute top-2 left-2 text-[11px] bg-amber-500 text-black px-1.5 py-0.5 rounded-full font-semibold">♥ {s.coup_coeur}</div>}
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                      <div className="text-[11px] text-zinc-300">{s.genre}</div>
                      <div className="font-semibold text-sm leading-tight line-clamp-2">{s.name}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{s.heure} · {s.duration}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1.5 truncate">{s.theatre_name}</div>
                </div>
              )
            })}
          </div>
          {filtered.length>200 && <div className="text-center text-zinc-500 text-sm mt-6">Affichage des 200 premiers — affine ta recherche</div>}
        </main>
      </div>

      {/* planner sidebar */}
      <aside className="w-[340px] shrink-0 border-l border-zinc-800 bg-[#14141b] p-5 h-screen sticky top-0 overflow-y-auto">
        <h2 className="font-semibold mb-1">Mon planning</h2>
        <p className="text-xs text-zinc-500 mb-4">12-13 juillet · 6 créneaux</p>
        <div className="space-y-3">
          {SLOTS.map(slot => {
            const assigned = showById(plan[slot.key])
            return (
              <div key={slot.key} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 min-h-[88px]">
                <div className="text-[11px] text-zinc-400 mb-1">{slot.label}</div>
                {assigned ? (
                  <div className="flex gap-2">
                    <img src={assigned.header_image} className="w-10 h-14 object-cover rounded" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{assigned.name}</div>
                      <div className="text-[11px] text-zinc-400">{assigned.heure} · {assigned.theatre_name}</div>
                      <button onClick={()=>assignSlot(slot.key,null)} className="text-[11px] text-zinc-500 hover:text-zinc-300 mt-1">retirer</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-600">— vide —</div>
                )}
              </div>
            )
          })}
        </div>
        {Object.values(plan).filter(Boolean).length > 0 && (
          <button onClick={()=>{ if(confirm('Vider le planning ?')) setPlan({ '12-matin':null,'12-aprem':null,'12-soir':null,'13-matin':null,'13-aprem':null,'13-soir':null }) }}
            className="text-xs text-zinc-500 mt-4 hover:text-zinc-300">Réinitialiser</button>
        )}
        <div className="text-[11px] text-zinc-600 mt-6">Favoris + planning stockés localement. Partageable via export.</div>
      </aside>

      {/* detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={()=>setSelected(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-y-auto flex flex-col md:flex-row" onClick={e=>e.stopPropagation()}>
            {selected.header_image && <img src={selected.header_image} className="md:w-64 w-full h-64 md:h-auto object-cover" />}
            <div className="p-5 flex-1 min-w-0">
              <div className="flex justify-between gap-3">
                <h2 className="text-lg font-bold">{selected.name}</h2>
                <button onClick={()=>setSelected(null)} className="text-zinc-500">✕</button>
              </div>
              <div className="text-sm text-zinc-400 mb-2">{selected.genre} · {selected.heure} · {selected.duration}</div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap mb-3">{selected.content}</p>
              <div className="text-xs text-zinc-400 space-y-1 mb-3">
                <div>{selected.theatre_name} {selected.salle && `· ${selected.salle}`}</div>
                <div>{selected.dates}{selected.relache && ` · relâche ${selected.relache}`}</div>
                {selected.auteur && <div>Auteur : {selected.auteur}</div>}
              </div>
              <div className="flex gap-2 flex-wrap mb-3">
                <button onClick={()=>toggleFav(selected.id)}
                  className={`px-3 py-1.5 rounded-full text-sm ${fav.includes(selected.id) ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
                  ♥ {fav.includes(selected.id) ? 'Favori' : 'Ajouter'}
                </button>
                {SLOTS.map(slot => {
                  const ok = fitsSlot(selected, slot) && (playsOn(selected, slot.key.startsWith('12')?12:13))
                  return <button key={slot.key} disabled={!ok} onClick={() => { assignSlot(slot.key, selected.id); setSelected(null)}}
                    className={`px-2.5 py-1 rounded text-[11px] border ${ok ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
                    {slot.label.split(' · ')[1]}
                  </button>
                })}
              </div>
              {selected.off_url && <a href={selected.off_url} target="_blank" className="text-orange-400 text-sm hover:underline">Voir sur festivaloffavignon.com →</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
