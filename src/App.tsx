import { useMemo, useState, useEffect } from 'react'
import showsData from './shows.json'

type Show = typeof showsData[number]
type SlotKey = '12-matin' | '12-aprem' | '12-soir' | '13-matin' | '13-aprem' | '13-soir'
const SLOTS: { key: SlotKey; day: string; label: string; time: string; minH: number; maxH: number }[] = [
  { key: '12-matin', day: 'Sam 12', label: 'Matin', time: '10h–13h', minH: 0, maxH: 12 },
  { key: '12-aprem', day: 'Sam 12', label: 'Après-midi', time: '13h–17h', minH: 13, maxH: 17 },
  { key: '12-soir',  day: 'Sam 12', label: 'Soirée', time: '18h+', minH: 18, maxH: 99 },
  { key: '13-matin', day: 'Dim 13', label: 'Matin', time: '10h–13h', minH: 0, maxH: 12 },
  { key: '13-aprem', day: 'Dim 13', label: 'Après-midi', time: '13h–17h', minH: 13, maxH: 17 },
  { key: '13-soir',  day: 'Dim 13', label: 'Soirée', time: '18h+', minH: 18, maxH: 99 },
]

function parseHour(h: string | null) {
  if (!h) return null
  const m = h.match(/(\d{1,2})h(\d{0,2})/)
  return m ? parseInt(m[1]) + (parseInt(m[2]||'0')/60) : null
}
function playsOn(show: Show, day: 12|13) {
  const dates = show.dates || ''; const rel = show.relache || ''
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
  const [popId, setPopId] = useState<string | null>(null)

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

  const toggleFav = (id: string) => {
    const adding = !fav.includes(id)
    setFav(f => f.includes(id) ? f.filter(x=>x!==id) : [...f, id])
    if (adding) { setPopId(id); setTimeout(()=>setPopId(null), 350) }
  }
  const assignSlot = (slot: SlotKey, showId: string | null) => setPlan(p => ({...p, [slot]: showId}))
  const showById = (id: string | null) => showsData.find(s=>s.id===id) || null
  const plannedCount = Object.values(plan).filter(Boolean).length

  return (
    <div className="min-h-screen bg-[#0c0c12] text-zinc-200 flex" style={{fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'}}>
      <style>{`@keyframes heartpop{0%{transform:scale(.7)}50%{transform:scale(1.35)}100%{transform:scale(1)}} .heart-pop{animation:heartpop .32s cubic-bezier(.34,1.56,.64,1)}`}</style>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-[#0c0c12]/85 backdrop-blur-xl border-b border-zinc-800/80 px-7 pt-5 pb-4">
          <div className="flex items-center gap-5 flex-wrap">
            <h1 className="text-[22px] font-[650] tracking-tight">Avignon <span className="text-zinc-500 font-[450]">Off 2026</span></h1>
            <div className="flex-1 min-w-[260px] relative max-w-2xl group">
              <i className="ph-fill ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[15px] transition-colors group-focus-within:text-zinc-300" />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un spectacle, un lieu, un auteur…"
                className="w-full bg-[#16161f] border border-zinc-800 rounded-full pl-11 pr-5 py-[11px] text-[14px] placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:bg-[#1b1b26] transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,.4)]"/>
              {search && <button onClick={()=>setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">✕</button>}
            </div>
            <select value={genre} onChange={e=>setGenre(e.target.value)}
              className="text-[13px] bg-[#16161f] border border-zinc-800 rounded-full px-4 py-[9px] text-zinc-300 focus:outline-none focus:border-zinc-600">
              <option value="">Tous les genres</option>
              {genres.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
            <label className="text-[12px] text-zinc-400 flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={onlyAvailable} onChange={e=>setOnlyAvailable(e.target.checked)} className="accent-rose-400" />
              12–13 juillet
            </label>
            <button onClick={()=>setViewFav(!viewFav)}
              className={`text-[13px] px-4 py-[9px] rounded-full border transition ${viewFav ? 'bg-rose-500 text-white border-rose-500 shadow-[0_0_18px_rgba(244,63,94,.25)]' : 'border-zinc-800 text-zinc-300 hover:border-zinc-600 bg-[#16161f]'}`}>
              ♥ Favoris {fav.length>0 && <span className="opacity-80">· {fav.length}</span>}
            </button>
          </div>
          <div className="text-[11.5px] text-zinc-500 mt-3">{filtered.length} spectacles · triés par Coup de cœur</div>
        </header>

        <main className="px-7 py-7">
          <div className="grid gap-x-5 gap-y-8 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {filtered.slice(0,210).map(s => {
              const isFav = fav.includes(s.id)
              const pop = popId === s.id
              return (
                <div key={s.id} className="group cursor-pointer" onClick={()=>setSelected(s)}>
                  <div className="relative aspect-[3/4.25] rounded-[16px] overflow-hidden bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,.45)] ring-1 ring-white/[0.06] group-hover:ring-white/[0.12] transition">
                    {s.header_image
                      ? <img src={s.header_image} alt={s.name} loading="lazy" className="w-full h-full object-cover transition duration-500 group-hover:scale-[1.04] group-hover:brightness-[1.06]"/>
                      : <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900">🎭</div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent opacity-[.92]" />
                    <button onClick={e=>{e.stopPropagation();toggleFav(s.id)}}
                      className={`absolute top-3 right-3 w-[34px] h-[34px] rounded-full flex items-center justify-center text-[15px] transition backdrop-blur-md ${pop ? 'heart-pop' : ''} ${isFav ? 'bg-rose-500 text-white shadow-[0_0_16px_rgba(244,63,94,.45)]' : 'bg-black/45 text-zinc-200 hover:bg-black/65 ring-1 ring-white/10'}`}>♥</button>
                    {s.coup_coeur>0 && <div className="absolute top-3 left-3 text-[11px] bg-amber-400 text-zinc-900 px-2 py-[2px] rounded-full font-[650] shadow">♥ {s.coup_coeur}</div>}
                    <div className="absolute bottom-0 inset-x-0 p-3.5">
                      <div className="text-[11px] text-zinc-300/90 mb-0.5">{s.genre || '—'}</div>
                      <div className="font-[600] text-[13.5px] leading-snug line-clamp-2 text-white drop-shadow">{s.name}</div>
                      <div className="text-[11px] text-zinc-300/80 mt-1">{s.heure || '—'} {s.duration && `· ${s.duration}`}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-2 truncate">{s.theatre_name}</div>
                </div>
              )
            })}
          </div>
          {filtered.length>210 && <div className="text-center text-zinc-500 text-sm mt-8">Affichage des 210 premiers — affine ta recherche</div>}
        </main>
      </div>

      {/* planner */}
      <aside className="w-[360px] shrink-0 border-l border-zinc-800/90 bg-[#111117] h-screen sticky top-0 overflow-y-auto">
        <div className="p-5 pb-3 sticky top-0 bg-[#111117]/95 backdrop-blur z-10 border-b border-zinc-800/80">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-[650]">Mon planning</h2>
            <span className="text-[11px] text-zinc-500">{plannedCount} / 6</span>
          </div>
          <p className="text-[11.5px] text-zinc-500 mt-1">12–13 juillet · glisse tes favoris dans les créneaux</p>
        </div>
        <div className="p-5 pt-4 space-y-5">
          {(['Sam 12','Dim 13'] as const).map(dayLabel => (
            <div key={dayLabel}>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">{dayLabel} juillet</div>
              <div className="space-y-2.5">
                {SLOTS.filter(s=>s.day===dayLabel).map(slot => {
                  const assigned = showById(plan[slot.key])
                  const isEmpty = !assigned
                  return (
                    <div key={slot.key}
                      className={`rounded-[14px] border px-3 py-3 transition ${isEmpty ? 'border-dashed border-zinc-700/80 bg-zinc-900/40' : 'border-zinc-800 bg-[#17171f] shadow-[0_4px_18px_rgba(0,0,0,.25)]'}`}>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                        <span className="font-[550] text-zinc-300">{slot.label}</span>
                        <span className="text-zinc-500">{slot.time}</span>
                      </div>
                      {assigned ? (
                        <div className="flex gap-2.5 items-center">
                          <img src={assigned.header_image} className="w-11 h-14 object-cover rounded-md ring-1 ring-white/10" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[12.5px] font-[550] truncate">{assigned.name}</div>
                            <div className="text-[11px] text-zinc-400">{assigned.heure} · {(assigned.theatre_name||'').slice(0,28)}</div>
                            <button onClick={()=>assignSlot(slot.key,null)} className="text-[11px] text-zinc-500 hover:text-zinc-300 mt-0.5">retirer</button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[12px] text-zinc-600">— vide —</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Favoris stockés localement</span>
            {plannedCount>0 && <button onClick={()=>{ if(confirm('Vider le planning ?')) setPlan({ '12-matin':null,'12-aprem':null,'12-soir':null,'13-matin':null,'13-aprem':null,'13-soir':null }) }} className="hover:text-zinc-300">Réinitialiser</button>}
          </div>
        </div>
      </aside>

      {/* detail */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setSelected(null)}>
          <div className="bg-[#15151d] border border-zinc-800 rounded-[20px] max-w-3xl w-full max-h-[88vh] overflow-hidden shadow-2xl flex flex-col md:flex-row" onClick={e=>e.stopPropagation()}>
            {selected.header_image && <img src={selected.header_image} className="md:w-[260px] w-full h-56 md:h-auto object-cover" />}
            <div className="p-5 flex-1 min-w-0 overflow-y-auto">
              <div className="flex justify-between gap-3 items-start">
                <h2 className="text-[18px] font-[650] leading-snug">{selected.name}</h2>
                <button onClick={()=>setSelected(null)} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">✕</button>
              </div>
              <div className="text-[13px] text-zinc-400 mt-1 mb-3">{selected.genre} · {selected.heure} · {selected.duration}</div>
              <p className="text-[13.5px] leading-relaxed text-zinc-300 whitespace-pre-wrap mb-3">{selected.content}</p>
              <div className="text-[12px] text-zinc-400 space-y-1 mb-4">
                <div>{selected.theatre_name} {selected.salle && `· ${selected.salle}`}</div>
                <div>{selected.dates}{selected.relache && ` · relâche ${selected.relache}`}</div>
                {selected.auteur && <div>Auteur : {selected.auteur}</div>}
              </div>
              <div className="flex gap-2 flex-wrap mb-3 items-center">
                <button onClick={()=>toggleFav(selected.id)}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-[550] transition ${fav.includes(selected.id) ? 'bg-rose-500 text-white shadow-[0_0_14px_rgba(244,63,94,.35)]' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}`}>
                  ♥ {fav.includes(selected.id) ? 'Favori' : 'Ajouter aux favoris'}
                </button>
                <span className="text-[11px] text-zinc-500 ml-1">Placer dans :</span>
                {SLOTS.map(slot => {
                  const ok = fitsSlot(selected, slot) && (playsOn(selected, slot.key.startsWith('12')?12:13))
                  return <button key={slot.key} disabled={!ok} onClick={() => { assignSlot(slot.key, selected.id); setSelected(null)}}
                    className={`px-2.5 py-1 rounded-full text-[11px] border transition ${ok ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
                    {slot.day.split(' ')[1]} {slot.label}
                  </button>
                })}
              </div>
              {selected.off_url && <a href={selected.off_url} target="_blank" className="text-rose-300 text-[13px] hover:underline">Voir sur festivaloffavignon.com →</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
