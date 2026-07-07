import { useMemo, useState, useEffect } from 'react'
import showsData from './shows.json'

type Show = typeof showsData[number]
type SlotKey = '12-matin' | '12-aprem' | '12-soir' | '13-matin' | '13-aprem' | '13-soir'
const SLOTS: { key: SlotKey; dayShort: string; dayLong: string; label: string; time: string; minH: number; maxH: number }[] = [
  { key: '12-matin', dayShort: 'Sam 12', dayLong: 'Samedi 12 juillet', label: 'Matin', time: '10h – 13h', minH: 0, maxH: 12 },
  { key: '12-aprem', dayShort: 'Sam 12', dayLong: 'Samedi 12 juillet', label: 'Après-midi', time: '13h – 17h', minH: 13, maxH: 17 },
  { key: '12-soir',  dayShort: 'Sam 12', dayLong: 'Samedi 12 juillet', label: 'Soirée', time: '18h +', minH: 18, maxH: 99 },
  { key: '13-matin', dayShort: 'Dim 13', dayLong: 'Dimanche 13 juillet', label: 'Matin', time: '10h – 13h', minH: 0, maxH: 12 },
  { key: '13-aprem', dayShort: 'Dim 13', dayLong: 'Dimanche 13 juillet', label: 'Après-midi', time: '13h – 17h', minH: 13, maxH: 17 },
  { key: '13-soir',  dayShort: 'Dim 13', dayLong: 'Dimanche 13 juillet', label: 'Soirée', time: '18h +', minH: 18, maxH: 99 },
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
    if (adding) { setPopId(id); setTimeout(()=>setPopId(null), 420) }
  }
  const assignSlot = (slot: SlotKey, showId: string | null) => setPlan(p => ({...p, [slot]: showId}))
  const showById = (id: string | null) => showsData.find(s=>s.id===id) || null
  const plannedCount = Object.values(plan).filter(Boolean).length

  return (
    <div className="min-h-screen bg-[#0f0f16] text-zinc-200 antialiased" style={{fontFamily:'"DM Sans", ui-sans-serif, system-ui, sans-serif'}}>
      <style>{`
        .display { font-family: "Fraunces", serif; }
        @keyframes heartpop{0%{transform:scale(.5) rotate(-12deg)}50%{transform:scale(1.4) rotate(4deg)}100%{transform:scale(1) rotate(0deg)}}
        .heart-pop{animation:heartpop .42s cubic-bezier(.34,1.56,.64,1)}
        @keyframes heartfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
        .heart-float{animation:heartfloat 2s ease-in-out infinite}
      `}</style>

      <div className="flex min-h-screen">
        {/* main */}
        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 bg-[#0f0f16]/88 backdrop-blur-2xl border-b border-zinc-800/60">
            <div className="px-10 lg:px-14 pt-9 pb-7">
              <div className="flex items-baseline gap-4 flex-wrap mb-7">
                <h1 className="display text-[40px] font-[600] tracking-[-0.015em]">Avignon <span className="text-zinc-500 font-[500]">Off</span></h1>
                <span className="text-zinc-500 text-[15px]" style={{fontFamily:'"DM Sans",sans-serif'}}>12 — 13 juillet 2026</span>
              </div>

              <div className="flex items-center gap-4 flex-wrap max-w-[980px]">
                <div className="relative flex-1 min-w-[360px]">
                  <svg className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un spectacle, un lieu, un auteur…"
                    className="w-full bg-[#1a1a24] border border-zinc-800 rounded-full pl-[48px] pr-6 py-[14px] text-[15px] placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:bg-[#202030] transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,.35)]"/>
                  {search && <button onClick={()=>setSearch('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-[18px]">×</button>}
                </div>

                <select value={genre} onChange={e=>setGenre(e.target.value)}
                  className="text-[13.5px] bg-[#1a1a24] border border-zinc-800 rounded-full px-5 py-[13px] text-zinc-300 focus:outline-none focus:border-zinc-600">
                  <option value="">Tous les genres</option>
                  {genres.map(g=><option key={g} value={g}>{g}</option>)}
                </select>

                <label className="text-[13px] text-zinc-400 flex items-center gap-2.5 cursor-pointer select-none ml-1">
                  <input type="checkbox" checked={onlyAvailable} onChange={e=>setOnlyAvailable(e.target.checked)} className="accent-rose-400 w-3.5 h-3.5" />
                  12–13 juillet seulement
                </label>

                <button onClick={()=>setViewFav(!viewFav)}
                  className={`text-[13.5px] px-5 py-[13px] rounded-full border transition ml-auto ${viewFav ? 'bg-rose-500/95 text-white border-rose-500 shadow-[0_0_28px_rgba(244,63,94,.28)]' : 'border-zinc-800 text-zinc-300 hover:border-zinc-600 bg-[#1a1a24]'}`}>
                  <span className={viewFav ? 'heart-float inline-block' : ''}>♥</span> Favoris {fav.length>0 && <span className="opacity-75">· {fav.length}</span>}
                </button>
              </div>

              <div className="text-[12.5px] text-zinc-500 mt-4">{filtered.length} spectacles · triés par Coup de cœur</div>
            </div>
          </header>

          <main className="px-10 lg:px-14 py-12">
            <div className="grid gap-x-7 gap-y-11 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 max-w-[1400px]">
              {filtered.slice(0,200).map(s => {
                const isFav = fav.includes(s.id)
                const pop = popId === s.id
                return (
                  <div key={s.id} className="group cursor-pointer" onClick={()=>setSelected(s)}>
                    <div className="relative aspect-[4/5] rounded-[22px] overflow-hidden bg-zinc-900 shadow-[0_10px_40px_rgba(0,0,0,.5)] ring-1 ring-white/[0.055] group-hover:ring-white/[0.11] transition-all duration-300">
                      {s.header_image
                        ? <img src={s.header_image} alt={s.name} loading="lazy" className="w-full h-full object-cover transition duration-[600ms] ease-out group-hover:scale-[1.035] group-hover:brightness-[1.06]"/>
                        : <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900">🎭</div>}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-[.92]" />
                      <button onClick={e=>{e.stopPropagation();toggleFav(s.id)}}
                        className={`absolute top-4 right-4 w-[40px] h-[40px] rounded-full flex items-center justify-center text-[16px] transition-all backdrop-blur-md ${pop ? 'heart-pop' : ''} ${isFav ? 'bg-rose-500 text-white shadow-[0_0_22px_rgba(244,63,94,.5)] scale-105' : 'bg-black/45 text-zinc-200 hover:bg-black/70 ring-1 ring-white/12 hover:scale-105'}`}>♥</button>
                      {s.coup_coeur>0 && <div className="absolute top-4 left-4 text-[11px] bg-amber-300 text-zinc-900 px-2.5 py-[3px] rounded-full font-[600] shadow-md">♥ {s.coup_coeur}</div>}
                      <div className="absolute bottom-0 inset-x-0 px-5 pb-5 pt-12">
                        <div className="text-[12px] text-zinc-300/85 mb-1.5">{s.genre || '—'}</div>
                        <div className="display font-[600] text-[20px] leading-snug line-clamp-2 text-white">{s.name}</div>
                        <div className="text-[12.5px] text-zinc-300/75 mt-2">{s.heure || '—'} {s.duration && `· ${s.duration}`}</div>
                      </div>
                    </div>
                    <div className="text-[12.5px] text-zinc-500 mt-3.5 px-1 truncate">{s.theatre_name}</div>
                  </div>
                )
              })}
            </div>
            {filtered.length>200 && <div className="text-center text-zinc-500 text-sm mt-12">Affichage des 200 premiers — affine ta recherche</div>}
          </main>
        </div>

        {/* planner */}
        <aside className="w-[400px] shrink-0 border-l border-zinc-800/70 bg-[#14141c] min-h-screen sticky top-0 self-start">
          <div className="px-7 pt-9 pb-5 sticky top-0 bg-[#14141c]/97 backdrop-blur z-10 border-b border-zinc-800/60">
            <div className="flex items-baseline justify-between mb-1.5">
              <h2 className="display text-[26px] font-[600]">Mon planning</h2>
              <span className="text-[12px] text-zinc-500 font-[500]">{plannedCount} / 6</span>
            </div>
            <p className="text-[12.5px] text-zinc-500">Clique un spectacle puis assigne-le à un créneau</p>
          </div>

          <div className="px-7 py-7 space-y-8">
            {(['Samedi 12 juillet','Dimanche 13 juillet'] as const).map((dayLong, dayIdx) => (
              <div key={dayLong}>
                <div className="flex items-center gap-3 mb-3.5">
                  <div className="h-px bg-zinc-800 flex-1"></div>
                  <div className="text-[11px] uppercase tracking-widest text-zinc-500 font-[600]">{dayLong}</div>
                  <div className="h-px bg-zinc-800 flex-1"></div>
                </div>
                <div className="space-y-3">
                  {SLOTS.filter(s=>s.dayLong===dayLong).map(slot => {
                    const assigned = showById(plan[slot.key])
                    return (
                      <div key={slot.key}
                        className={`rounded-[18px] px-4 py-4 transition ${assigned ? 'bg-[#1d1d28] border border-zinc-700/70 shadow-[0_6px_24px_rgba(0,0,0,.28)]' : 'border border-dashed border-zinc-700/70 bg-transparent'}`}>
                        <div className="flex items-baseline justify-between mb-2.5">
                          <span className="text-[13.5px] font-[550] text-zinc-200">{slot.label}</span>
                          <span className="text-[11.5px] text-zinc-500">{slot.time}</span>
                        </div>
                        {assigned ? (
                          <div className="flex gap-3.5 items-center">
                            {assigned.header_image && <img src={assigned.header_image} className="w-14 h-[72px] object-cover rounded-[10px] ring-1 ring-white/10 flex-shrink-0" />}
                            <div className="min-w-0 flex-1">
                              <div className="text-[13.5px] font-[550] leading-snug line-clamp-2">{assigned.name}</div>
                              <div className="text-[11.5px] text-zinc-400 mt-1">{assigned.heure} · {(assigned.theatre_name||'').slice(0,34)}</div>
                              <button onClick={()=>assignSlot(slot.key,null)} className="text-[11px] text-zinc-500 hover:text-zinc-300 mt-1.5">retirer</button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[13px] text-zinc-600 py-1.5">Créneau libre</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-zinc-800/70 flex items-center justify-between text-[11.5px] text-zinc-500">
              <span>Tout est sauvegardé localement</span>
              {plannedCount>0 && <button onClick={()=>{ if(confirm('Vider le planning ?')) setPlan({ '12-matin':null,'12-aprem':null,'12-soir':null,'13-matin':null,'13-aprem':null,'13-soir':null }) }} className="hover:text-zinc-300">Réinitialiser</button>}
            </div>
          </div>
        </aside>
      </div>

      {/* detail */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={()=>setSelected(null)}>
          <div className="bg-[#181820] border border-zinc-800 rounded-[28px] max-w-4xl w-full max-h-[88vh] overflow-hidden shadow-2xl flex flex-col md:flex-row" onClick={e=>e.stopPropagation()}>
            {selected.header_image && <img src={selected.header_image} className="md:w-[300px] w-full h-64 md:h-auto object-cover flex-shrink-0" />}
            <div className="p-8 flex-1 min-w-0 overflow-y-auto">
              <div className="flex justify-between gap-4 items-start">
                <h2 className="display text-[26px] font-[600] leading-snug">{selected.name}</h2>
                <button onClick={()=>setSelected(null)} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none">×</button>
              </div>
              <div className="text-[13.5px] text-zinc-400 mt-2 mb-4">{selected.genre} · {selected.heure} · {selected.duration}</div>
              <p className="text-[14.5px] leading-relaxed text-zinc-300 whitespace-pre-wrap mb-5">{selected.content}</p>
              <div className="text-[12.5px] text-zinc-400 space-y-1.5 mb-6">
                <div>{selected.theatre_name} {selected.salle && `· ${selected.salle}`}</div>
                <div>{selected.dates}{selected.relache && ` · relâche ${selected.relache}`}</div>
                {selected.auteur && <div>Auteur : {selected.auteur}</div>}
              </div>
              <div className="flex gap-2.5 flex-wrap mb-4 items-center">
                <button onClick={()=>toggleFav(selected.id)}
                  className={`px-4 py-2 rounded-full text-[13.5px] font-[550] transition ${fav.includes(selected.id) ? 'bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,.35)]' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}`}>
                  ♥ {fav.includes(selected.id) ? 'Favori' : 'Ajouter aux favoris'}
                </button>
              </div>
              <div className="border-t border-zinc-800 pt-4 mt-4">
                <div className="text-[12px] text-zinc-500 mb-2.5">Placer dans mon planning :</div>
                <div className="flex gap-2 flex-wrap">
                  {SLOTS.map(slot => {
                    const ok = fitsSlot(selected, slot) && (playsOn(selected, slot.key.startsWith('12')?12:13))
                    return <button key={slot.key} disabled={!ok} onClick={() => { assignSlot(slot.key, selected.id); setSelected(null)}}
                      className={`px-3.5 py-[7px] rounded-full text-[12px] border transition ${ok ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-800/60 text-zinc-600 cursor-not-allowed'}`}>
                      {slot.dayShort} · {slot.label}
                    </button>
                  })}
                </div>
              </div>
              {selected.off_url && <a href={selected.off_url} target="_blank" className="text-rose-300 text-[13px] hover:underline block mt-5">Voir sur festivaloffavignon.com →</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
