import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import showsData from './shows.json'

type Show = typeof showsData[number]
type SlotKey = '12-matin' | '12-aprem' | '12-soir' | '13-matin' | '13-aprem' | '13-soir'
const SLOTS: { key: SlotKey; dayShort: string; dayLong: string; label: string; time: string; minH: number; maxH: number }[] = [
  { key: '12-matin', dayShort: 'Dim 12', dayLong: 'Dimanche 12 juillet', label: 'Matin', time: '< 12h', minH: 0, maxH: 11.99 },
  { key: '12-aprem', dayShort: 'Dim 12', dayLong: 'Dimanche 12 juillet', label: 'Après-midi', time: '12h – 15h30', minH: 12, maxH: 15.49 },
  { key: '12-soir',  dayShort: 'Dim 12', dayLong: 'Dimanche 12 juillet', label: 'Soirée', time: '15h30 +', minH: 15.5, maxH: 99 },
  { key: '13-matin', dayShort: 'Lun 13', dayLong: 'Lundi 13 juillet', label: 'Matin', time: '< 12h', minH: 0, maxH: 11.99 },
  { key: '13-aprem', dayShort: 'Lun 13', dayLong: 'Lundi 13 juillet', label: 'Après-midi', time: '12h – 15h30', minH: 12, maxH: 15.49 },
  { key: '13-soir',  dayShort: 'Lun 13', dayLong: 'Lundi 13 juillet', label: 'Soirée', time: '15h30 +', minH: 15.5, maxH: 99 },
]

function TinderView({ pool, onLike, onNope, onClose, favCount, ignoredCount, genre, setGenre, genres }: {
  pool: Show[], onLike: (id: string) => void, onNope: (id: string) => void, onClose: () => void, favCount: number, ignoredCount: number,
  genre: string, setGenre: (g: string) => void, genres: string[]
}) {
  const dragRef = useRef<{ startX: number, startY: number, x: number, decided: boolean, isSwipe: boolean | null } | null>(null)
  const [dx, setDx] = useState(0)
  const [exitCard, setExitCard] = useState<{ dir: 'left'|'right', show: Show, startDx: number, launched: boolean } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const threshold = 80
  const show = pool[0] || null
  const next = pool[1] || null
  const isExiting = exitCard !== null
  const topShow = isExiting ? exitCard.show : show

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0 }, [show?.id])

  // Two-phase exit: first render at drag position, then launch off-screen
  useEffect(() => {
    if (exitCard && !exitCard.launched) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setExitCard(ec => ec ? { ...ec, launched: true } : null)
        })
      })
    }
  }, [exitCard])

  const doSwipe = useCallback((dir: 'left'|'right') => {
    if (!show || isExiting) return
    const currentDx = dragRef.current?.x || 0
    setExitCard({ dir, show, startDx: currentDx, launched: false })
    setDx(0)
    dragRef.current = null
    setTimeout(() => {
      if (dir === 'right') onLike(show.id); else onNope(show.id)
      setExitCard(null)
    }, 350)
  }, [show, isExiting, onLike, onNope])

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const onTouchStart = (e: TouchEvent) => {
      if (isExiting) return
      const t = e.touches[0]
      dragRef.current = { startX: t.clientX, startY: t.clientY, x: 0, decided: false, isSwipe: null }
    }

    const onTouchMove = (e: TouchEvent) => {
      const d = dragRef.current
      if (!d) return
      const t = e.touches[0]
      const tdx = t.clientX - d.startX
      const tdy = t.clientY - d.startY

      if (!d.decided && (Math.abs(tdx) > 10 || Math.abs(tdy) > 10)) {
        d.decided = true
        d.isSwipe = Math.abs(tdx) > Math.abs(tdy)
      }

      if (d.decided && !d.isSwipe) {
        dragRef.current = null
        setDx(0)
        return
      }

      if (d.isSwipe) {
        e.preventDefault()
        d.x = tdx
        setDx(tdx)
      }
    }

    const onTouchEnd = () => {
      const d = dragRef.current
      if (!d) return
      if (d.isSwipe && Math.abs(d.x) > threshold) {
        doSwipe(d.x > 0 ? 'right' : 'left')
      } else {
        setDx(0)
      }
      dragRef.current = null
    }

    card.addEventListener('touchstart', onTouchStart, { passive: true })
    card.addEventListener('touchmove', onTouchMove, { passive: false })
    card.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      card.removeEventListener('touchstart', onTouchStart)
      card.removeEventListener('touchmove', onTouchMove)
      card.removeEventListener('touchend', onTouchEnd)
    }
  }, [doSwipe, isExiting])

  const dragRotate = dx * 0.04
  const likeOpacity = Math.max(0, Math.min(1, dx / threshold))
  const nopeOpacity = Math.max(0, Math.min(1, -dx / threshold))

  // Behind card: scale up when exiting
  const behindScale = isExiting ? 1 : 0.95
  const behindOpacity = isExiting ? 1 : 0.6

  // Exit card position
  const exitX = exitCard ? (exitCard.launched ? (exitCard.dir === 'left' ? -window.innerWidth * 1.5 : window.innerWidth * 1.5) : exitCard.startDx) : 0
  const exitRotate = exitCard ? (exitCard.launched ? (exitCard.dir === 'left' ? -15 : 15) : exitCard.startDx * 0.04) : 0

  if (!show && !exitCard) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0f0f16] flex flex-col items-center justify-center" style={{fontFamily:'"DM Sans", ui-sans-serif, system-ui, sans-serif'}}>
        <div className="text-6xl mb-6">🎭</div>
        <div className="text-[18px] font-[500] text-zinc-200 mb-2">Fini !</div>
        <div className="text-[14px] text-zinc-500 mb-8">{favCount} favoris · {ignoredCount} ignorés</div>
        <button onClick={onClose} className="px-6 py-3 rounded-full bg-zinc-800 text-zinc-200 text-[14px] font-[500] active:bg-zinc-700">Retour au catalogue</button>
      </div>
    )
  }

  // Info shows the next card during exit, current card otherwise
  const infoShow = isExiting ? (next || exitCard.show) : show

  return (
    <div className="fixed inset-0 z-50 bg-[#0f0f16] flex flex-col" style={{fontFamily:'"DM Sans", ui-sans-serif, system-ui, sans-serif'}}>
      {/* top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0 relative z-20 bg-[#0f0f16]">
        <button onClick={onClose} className="text-zinc-400 text-[14px] flex items-center gap-1 active:text-zinc-200 flex-shrink-0">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <select value={genre} onChange={e=>setGenre(e.target.value)}
          className="text-[12px] bg-[#1a1a24] border border-zinc-800 rounded-full px-3 py-[7px] text-zinc-300 focus:outline-none focus:border-zinc-600 max-w-[180px] truncate mx-2">
          <option value="">Tous les genres</option>
          {genres.map(g=><option key={g} value={g}>{g}</option>)}
        </select>
        <div className="text-[11px] text-zinc-500 tabular-nums flex-shrink-0">{pool.length} · {favCount} ♥</div>
      </div>

      {/* scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        {/* card stack */}
        <div ref={cardRef} className="relative w-full aspect-[3/4] max-h-[60vh] overflow-hidden select-none">

          {/* LAYER 1: next card behind (preloaded, scaled down) */}
          {next && (
            <div className="absolute inset-0" style={{
              zIndex: 1,
              transform: `scale(${behindScale})`,
              opacity: behindOpacity,
              transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
            }}>
              {next.header_image
                ? <img src={next.header_image} alt={next.name} className="w-full h-full object-cover pointer-events-none" draggable={false} />
                : <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900 text-[80px]">🎭</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f16] via-transparent to-transparent opacity-80" />
            </div>
          )}

          {/* LAYER 2: current card (follows finger) - hidden during exit */}
          {show && !isExiting && (
            <div className="absolute inset-0" style={{
              zIndex: 2,
              transform: `translateX(${dx}px) rotate(${dragRotate}deg)`,
              transition: dx ? 'none' : 'transform 0.2s ease-out',
              transformOrigin: 'center 80%',
            }}>
              {show.header_image
                ? <img src={show.header_image} alt={show.name} className="w-full h-full object-cover pointer-events-none" draggable={false} />
                : <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900 text-[80px]">🎭</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f16] via-transparent to-transparent opacity-80" />

              <div className="absolute top-1/3 left-8 border-[4px] border-emerald-400 rounded-2xl px-6 py-2 rotate-[-15deg] pointer-events-none"
                style={{ opacity: likeOpacity }}>
                <span className="text-emerald-400 text-[40px] font-[800] tracking-wider">LIKE</span>
              </div>
              <div className="absolute top-1/3 right-8 border-[4px] border-red-400 rounded-2xl px-6 py-2 rotate-[15deg] pointer-events-none"
                style={{ opacity: nopeOpacity }}>
                <span className="text-red-400 text-[40px] font-[800] tracking-wider">NOPE</span>
              </div>

              {show.coup_coeur > 0 && (
                <div className="absolute top-4 left-4 text-[12px] bg-amber-300 text-zinc-900 px-3 py-1 rounded-full font-[600] shadow-md pointer-events-none"
                  style={{ opacity: Math.max(0, 1 - likeOpacity - nopeOpacity) }}>
                  ♥ {show.coup_coeur}
                </div>
              )}
            </div>
          )}

          {/* LAYER 3: exiting card (flies off from drag position) */}
          {exitCard && (
            <div className="absolute inset-0" style={{
              zIndex: 3,
              transform: `translateX(${exitX}px) rotate(${exitRotate}deg)`,
              transition: exitCard.launched ? 'transform 0.35s ease-in, opacity 0.3s ease-in' : 'none',
              opacity: exitCard.launched ? 0 : 1,
              transformOrigin: 'center 80%',
            }}>
              {exitCard.show.header_image
                ? <img src={exitCard.show.header_image} alt={exitCard.show.name} className="w-full h-full object-cover pointer-events-none" draggable={false} />
                : <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900 text-[80px]">🎭</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f16] via-transparent to-transparent opacity-80" />

              <div className="absolute top-1/3 left-8 border-[4px] border-emerald-400 rounded-2xl px-6 py-2 rotate-[-15deg] pointer-events-none"
                style={{ opacity: exitCard.dir === 'right' ? 1 : 0 }}>
                <span className="text-emerald-400 text-[40px] font-[800] tracking-wider">LIKE</span>
              </div>
              <div className="absolute top-1/3 right-8 border-[4px] border-red-400 rounded-2xl px-6 py-2 rotate-[15deg] pointer-events-none"
                style={{ opacity: exitCard.dir === 'left' ? 1 : 0 }}>
                <span className="text-red-400 text-[40px] font-[800] tracking-wider">NOPE</span>
              </div>
            </div>
          )}
        </div>

        {/* show info */}
        {infoShow && (
          <div className="px-5 pt-1 pb-32">
            <div className="text-[12px] text-zinc-500 mb-1.5">{infoShow.genre || '—'}</div>
            <h2 className="font-[600] text-[26px] leading-snug text-white" style={{ fontFamily: '"Fraunces", serif' }}>{infoShow.name}</h2>
            <div className="text-[14px] text-zinc-300/80 mt-2.5">
              {infoShow.heure || '—'} {infoShow.duration && `· ${infoShow.duration}`}
            </div>
            <div className="text-[14px] text-zinc-400 mt-1">{infoShow.theatre_name}{infoShow.salle && ` · ${infoShow.salle}`}</div>
            <div className="text-[13px] text-zinc-500 mt-1">{infoShow.dates}{infoShow.relache && ` · relâche ${infoShow.relache}`}</div>
            {infoShow.auteur && <div className="text-[13px] text-zinc-500 mt-1">Auteur : {infoShow.auteur}</div>}
            {infoShow.content && <p className="text-[14px] text-zinc-300/80 mt-4 leading-relaxed whitespace-pre-wrap">{infoShow.content}</p>}
            {infoShow.off_url && <a href={infoShow.off_url} target="_blank" className="text-rose-300/80 text-[13px] mt-4 inline-block hover:underline">Voir sur festivaloffavignon.com →</a>}
          </div>
        )}
      </div>

      {/* fixed action buttons */}
      <div className="flex-shrink-0 flex items-center justify-center gap-10 py-4 pb-8 bg-gradient-to-t from-[#0f0f16] via-[#0f0f16] to-transparent absolute bottom-0 inset-x-0 z-30 pt-10">
        <button onClick={() => doSwipe('left')} disabled={isExiting}
          className="w-[68px] h-[68px] rounded-full bg-zinc-800/90 border-2 border-red-400/40 flex items-center justify-center text-[28px] text-red-400 active:scale-90 transition-transform shadow-xl backdrop-blur-sm">
          ✕
        </button>
        <button onClick={() => doSwipe('right')} disabled={isExiting}
          className="w-[68px] h-[68px] rounded-full bg-emerald-500/15 border-2 border-emerald-400/40 flex items-center justify-center text-[28px] text-emerald-400 active:scale-90 transition-transform shadow-xl backdrop-blur-sm">
          ♥
        </button>
      </div>
    </div>
  )
}

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
  const [creneau, setCreneau] = useState<'matin'|'aprem'|'soir'|''>('')
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const [fav, setFav] = useState<string[]>(() => JSON.parse(localStorage.getItem('avignon_fav') || '[]'))
  const [ignored, setIgnored] = useState<string[]>(() => JSON.parse(localStorage.getItem('avignon_ignored') || '[]'))
  const [plan, setPlan] = useState<Record<SlotKey, string | null>>(() => JSON.parse(localStorage.getItem('avignon_plan') || '{"12-matin":null,"12-aprem":null,"12-soir":null,"13-matin":null,"13-aprem":null,"13-soir":null}'))
  const [selected, setSelected] = useState<Show | null>(null)
  const [viewFav, setViewFav] = useState(false)
  const [viewIgnored, setViewIgnored] = useState(false)
  const [tinderMode, setTinderMode] = useState(false)
  const [popId, setPopId] = useState<string | null>(null)
  const [showPlan, setShowPlan] = useState(false)

  useEffect(() => { localStorage.setItem('avignon_fav', JSON.stringify(fav)) }, [fav])
  useEffect(() => { localStorage.setItem('avignon_ignored', JSON.stringify(ignored)) }, [ignored])
  useEffect(() => { localStorage.setItem('avignon_plan', JSON.stringify(plan)) }, [plan])

  const genres = useMemo(() => [...new Set(showsData.map(s => s.genre).filter(Boolean))].sort(), [])

  const filtered = useMemo(() => {
    let r = showsData as Show[]
    if (viewFav) r = r.filter(s => fav.includes(s.id))
    else if (viewIgnored) r = r.filter(s => ignored.includes(s.id))
    else r = r.filter(s => !ignored.includes(s.id))
    if (onlyAvailable) r = r.filter(s => playsOn(s,12) || playsOn(s,13))
    const q = search.toLowerCase()
    if (q) r = r.filter(s => (s.name + s.genre + s.theatre_name + s.auteur + s.content).toLowerCase().includes(q))
    if (genre) r = r.filter(s => s.genre === genre)
    if (creneau) r = r.filter(s => {
      const h = parseHour(s.heure)
      if (h === null) return true
      if (creneau==='matin') return h < 12
      if (creneau==='aprem') return h >= 12 && h < 15.5
      return h >= 15.5
    })
    return r.sort((a,b)=>(b.coup_coeur||0)-(a.coup_coeur||0))
  }, [search, genre, creneau, onlyAvailable, viewFav, viewIgnored, fav, ignored])

  const tinderPool = useMemo(() => {
    let r = showsData as Show[]
    r = r.filter(s => !fav.includes(s.id) && !ignored.includes(s.id))
    if (onlyAvailable) r = r.filter(s => playsOn(s,12) || playsOn(s,13))
    if (genre) r = r.filter(s => s.genre === genre)
    if (creneau) r = r.filter(s => {
      const h = parseHour(s.heure)
      if (h === null) return true
      if (creneau==='matin') return h < 12
      if (creneau==='aprem') return h >= 12 && h < 15.5
      return h >= 15.5
    })
    return r.sort((a,b)=>(b.coup_coeur||0)-(a.coup_coeur||0))
  }, [fav, ignored, onlyAvailable, genre, creneau])

  const toggleFav = (id: string) => {
    const adding = !fav.includes(id)
    setFav(f => f.includes(id) ? f.filter(x=>x!==id) : [...f, id])
    setIgnored(ig => ig.filter(x => x !== id))
    if (adding) { setPopId(id); setTimeout(()=>setPopId(null), 420) }
  }
  const toggleIgnored = (id: string) => {
    setIgnored(ig => ig.includes(id) ? ig.filter(x=>x!==id) : [...ig, id])
    setFav(f => f.filter(x => x !== id))
  }
  const assignSlot = (slot: SlotKey, showId: string | null) => setPlan(p => ({...p, [slot]: showId}))
  const showById = (id: string | null) => showsData.find(s=>s.id===id) || null
  const plannedCount = Object.values(plan).filter(Boolean).length

  const PlannerContent = () => (
    <>
      <div className="px-5 sm:px-7 pt-6 sm:pt-9 pb-4 sm:pb-5 sticky top-0 bg-[#14141c]/97 backdrop-blur z-10 border-b border-zinc-800/60 flex items-center justify-between lg:block">
        <div className="lg:flex lg:items-baseline lg:justify-between lg:mb-1.5">
          <h2 className="display text-[22px] sm:text-[26px] font-[600]">Mon planning</h2>
          <span className="text-[12px] text-zinc-500 font-[500] ml-3 lg:ml-0">{plannedCount} / 6</span>
        </div>
        <p className="text-[12.5px] text-zinc-500 hidden lg:block">Clique un spectacle puis assigne-le à un créneau</p>
        <button onClick={()=>setShowPlan(false)} className="lg:hidden text-zinc-400 text-xl px-2 -mr-2">×</button>
      </div>
      <div className="px-5 sm:px-7 py-6 sm:py-7 space-y-7 sm:space-y-8">
        {(['Dimanche 12 juillet','Lundi 13 juillet'] as const).map((dayLong) => (
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
    </>
  )

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
        <div className="flex-1 min-w-0 pb-20 lg:pb-0">
          <header className="sticky top-0 z-30 bg-[#0f0f16]/88 backdrop-blur-2xl border-b border-zinc-800/60">
            <div className="px-5 sm:px-10 lg:px-14 pt-5 sm:pt-9 pb-4 sm:pb-7">
              <div className="flex items-baseline gap-3 sm:gap-4 flex-wrap mb-4 sm:mb-7">
                <h1 className="display text-[28px] sm:text-[40px] font-[600] tracking-[-0.015em]">Avignon <span className="text-zinc-500 font-[500]">Off</span></h1>
                <span className="text-zinc-500 text-[13px] sm:text-[15px]">Dim 12 — Lun 13 juillet 2026</span>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap">
                <div className="relative flex-1 min-w-0 sm:min-w-[300px] w-full sm:w-auto order-1 sm:order-none">
                  <svg className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-zinc-500" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher…"
                    className="w-full bg-[#1a1a24] border border-zinc-800 rounded-full pl-[40px] sm:pl-[48px] pr-5 sm:pr-6 py-[12px] sm:py-[14px] text-[14px] sm:text-[15px] placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:bg-[#202030] transition-all"/>
                  {search && <button onClick={()=>setSearch('')} className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-[18px]">×</button>}
                </div>

                <select value={genre} onChange={e=>setGenre(e.target.value)}
                  className="text-[12.5px] sm:text-[13.5px] bg-[#1a1a24] border border-zinc-800 rounded-full px-3.5 sm:px-5 py-[10px] sm:py-[13px] text-zinc-300 focus:outline-none focus:border-zinc-600 max-w-[150px] sm:max-w-none">
                  <option value="">Tous les genres</option>
                  {genres.map(g=><option key={g} value={g}>{g}</option>)}
                </select>

                <select value={creneau} onChange={e=>setCreneau(e.target.value as any)}
                  className="text-[12.5px] sm:text-[13.5px] bg-[#1a1a24] border border-zinc-800 rounded-full px-3.5 sm:px-5 py-[10px] sm:py-[13px] text-zinc-300 focus:outline-none focus:border-zinc-600">
                  <option value="">Tous créneaux</option>
                  <option value="matin">Matin &lt; 12h</option>
                  <option value="aprem">Après-midi 12h–15h30</option>
                  <option value="soir">Soirée 15h30+</option>
                </select>

                <button onClick={()=>{setViewFav(!viewFav);setViewIgnored(false);setTinderMode(false)}}
                  className={`text-[12.5px] sm:text-[13.5px] px-3.5 sm:px-5 py-[10px] sm:py-[13px] rounded-full border transition ${viewFav ? 'bg-rose-500/95 text-white border-rose-500 shadow-[0_0_28px_rgba(244,63,94,.28)]' : 'border-zinc-800 text-zinc-300 hover:border-zinc-600 bg-[#1a1a24]'}`}>
                  <span className={viewFav ? 'heart-float inline-block' : ''}>♥</span><span className="hidden xs:inline"> Favoris</span> {fav.length>0 && <span className="opacity-75">· {fav.length}</span>}
                </button>

                <button onClick={()=>{setViewIgnored(!viewIgnored);setViewFav(false);setTinderMode(false)}}
                  className={`text-[12.5px] sm:text-[13.5px] px-3.5 sm:px-5 py-[10px] sm:py-[13px] rounded-full border transition ${viewIgnored ? 'bg-zinc-600/95 text-white border-zinc-500 shadow-[0_0_28px_rgba(100,100,100,.28)]' : 'border-zinc-800 text-zinc-300 hover:border-zinc-600 bg-[#1a1a24]'}`}>
                  ✕<span className="hidden xs:inline"> Ignorés</span> {ignored.length>0 && <span className="opacity-75">· {ignored.length}</span>}
                </button>

                <button onClick={()=>{setTinderMode(!tinderMode);setViewFav(false);setViewIgnored(false)}}
                  className={`text-[12.5px] sm:text-[13.5px] px-3.5 sm:px-5 py-[10px] sm:py-[13px] rounded-full border transition ${tinderMode ? 'bg-gradient-to-r from-rose-500 to-orange-400 text-white border-rose-500 shadow-[0_0_28px_rgba(244,63,94,.28)]' : 'border-zinc-800 text-zinc-300 hover:border-zinc-600 bg-[#1a1a24]'}`}>
                  🔥<span className="hidden xs:inline"> Tinder</span>
                </button>

                <label className="text-[11.5px] sm:text-[13px] text-zinc-400 flex items-center gap-2 cursor-pointer select-none w-full sm:w-auto order-last sm:order-none mt-0.5 sm:mt-0">
                  <input type="checkbox" checked={onlyAvailable} onChange={e=>setOnlyAvailable(e.target.checked)} className="accent-rose-400 w-3.5 h-3.5" />
                  12–13 juillet seulement
                </label>
              </div>

              <div className="text-[11.5px] sm:text-[12.5px] text-zinc-500 mt-3 sm:mt-4">{filtered.length} spectacles</div>
            </div>
          </header>

          <main className="px-5 sm:px-10 lg:px-14 py-6 sm:py-12">
            {!tinderMode && (
            <div className="grid gap-x-4 sm:gap-x-7 gap-y-7 sm:gap-y-11 grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 max-w-[1400px]">
              {filtered.slice(0,200).map(s => {
                const isFav = fav.includes(s.id)
                const isIgnored = ignored.includes(s.id)
                const pop = popId === s.id
                return (
                  <div key={s.id} className="group cursor-pointer" onClick={()=>setSelected(s)}>
                    <div className={`relative aspect-[4/5] rounded-[16px] sm:rounded-[22px] overflow-hidden bg-zinc-900 shadow-[0_10px_40px_rgba(0,0,0,.5)] ring-1 ring-white/[0.055] group-hover:ring-white/[0.11] transition-all duration-300 ${isIgnored ? 'opacity-50' : ''}`}>
                      {s.header_image
                        ? <img src={s.header_image} alt={s.name} loading="lazy" className="w-full h-full object-cover transition duration-[600ms] ease-out group-hover:scale-[1.035] group-hover:brightness-[1.06]"/>
                        : <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900">🎭</div>}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-[.92]" />
                      <button onClick={e=>{e.stopPropagation();toggleFav(s.id)}}
                        className={`absolute top-2.5 right-2.5 sm:top-4 sm:right-4 w-[34px] h-[34px] sm:w-[40px] sm:h-[40px] rounded-full flex items-center justify-center text-[14px] sm:text-[16px] transition-all backdrop-blur-md ${pop ? 'heart-pop' : ''} ${isFav ? 'bg-rose-500 text-white shadow-[0_0_22px_rgba(244,63,94,.5)] scale-105' : 'bg-black/45 text-zinc-200 active:bg-black/70 ring-1 ring-white/12'}`}>♥</button>
                      <button onClick={e=>{e.stopPropagation();toggleIgnored(s.id)}}
                        className={`absolute top-2.5 right-[46px] sm:top-4 sm:right-[52px] w-[34px] h-[34px] sm:w-[40px] sm:h-[40px] rounded-full flex items-center justify-center text-[12px] sm:text-[14px] transition-all backdrop-blur-md ${isIgnored ? 'bg-zinc-600 text-white' : 'bg-black/45 text-zinc-400 active:bg-black/70 ring-1 ring-white/12'}`}>✕</button>
                      {s.coup_coeur>0 && <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 text-[10px] sm:text-[11px] bg-amber-300 text-zinc-900 px-2 sm:px-2.5 py-[2px] sm:py-[3px] rounded-full font-[600] shadow-md">♥ {s.coup_coeur}</div>}
                      <div className="absolute bottom-0 inset-x-0 px-3 sm:px-5 pb-3 sm:pb-5 pt-10">
                        <div className="text-[10.5px] sm:text-[12px] text-zinc-300/85 mb-1 truncate">{s.genre || '—'}</div>
                        <div className="display font-[600] text-[15px] sm:text-[20px] leading-snug line-clamp-2 text-white">{s.name}</div>
                        <div className="text-[11px] sm:text-[12.5px] text-zinc-300/75 mt-1.5 sm:mt-2">{s.heure || '—'} {s.duration && `· ${s.duration}`}</div>
                      </div>
                    </div>
                    <div className="text-[11px] sm:text-[12.5px] text-zinc-500 mt-2 sm:mt-3.5 px-0.5 sm:px-1 truncate">{s.theatre_name}</div>
                  </div>
                )
              })}
            </div>
            )}
            {!tinderMode && filtered.length>200 && <div className="text-center text-zinc-500 text-sm mt-12">Affichage des 200 premiers — affine ta recherche</div>}
          </main>
        </div>

        {/* planner - desktop sidebar */}
        <aside className="hidden lg:block w-[380px] xl:w-[400px] shrink-0 border-l border-zinc-800/70 bg-[#14141c] min-h-screen sticky top-0 self-start">
          <PlannerContent />
        </aside>
      </div>

      {/* mobile planner button */}
      <button onClick={()=>setShowPlan(true)}
        className="lg:hidden fixed bottom-5 right-5 z-40 bg-rose-500 text-white rounded-full px-5 py-3.5 text-[14px] font-[550] shadow-[0_8px_32px_rgba(244,63,94,.45)] active:scale-95 transition-transform">
        Planning · {plannedCount}/6
      </button>

      {/* mobile planner sheet */}
      {showPlan && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={()=>setShowPlan(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto bg-[#14141c] rounded-t-[24px] shadow-2xl" onClick={e=>e.stopPropagation()}>
            <PlannerContent />
            <div className="h-6" />
          </div>
        </div>
      )}

      {/* tinder fullscreen */}
      {tinderMode && <TinderView pool={tinderPool} onLike={toggleFav} onNope={toggleIgnored} onClose={()=>setTinderMode(false)} favCount={fav.length} ignoredCount={ignored.length} genre={genre} setGenre={setGenre} genres={genres} />}

      {/* detail */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-6" onClick={()=>setSelected(null)}>
          <div className="bg-[#181820] sm:border sm:border-zinc-800 sm:rounded-[28px] rounded-t-[24px] max-w-4xl w-full max-h-[92vh] sm:max-h-[88vh] overflow-hidden shadow-2xl flex flex-col md:flex-row" onClick={e=>e.stopPropagation()}>
            {selected.header_image && <img src={selected.header_image} className="md:w-[300px] w-full h-48 sm:h-64 md:h-auto object-cover flex-shrink-0" />}
            <div className="p-5 sm:p-8 flex-1 min-w-0 overflow-y-auto">
              <div className="flex justify-between gap-4 items-start">
                <h2 className="display text-[22px] sm:text-[26px] font-[600] leading-snug">{selected.name}</h2>
                <button onClick={()=>setSelected(null)} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none px-1">×</button>
              </div>
              <div className="text-[12.5px] sm:text-[13.5px] text-zinc-400 mt-2 mb-3 sm:mb-4">{selected.genre} · {selected.heure} · {selected.duration}</div>
              <p className="text-[13.5px] sm:text-[14.5px] leading-relaxed text-zinc-300 whitespace-pre-wrap mb-4 sm:mb-5">{selected.content}</p>
              <div className="text-[12px] sm:text-[12.5px] text-zinc-400 space-y-1.5 mb-5 sm:mb-6">
                <div>{selected.theatre_name} {selected.salle && `· ${selected.salle}`}</div>
                <div>{selected.dates}{selected.relache && ` · relâche ${selected.relache}`}</div>
                {selected.auteur && <div>Auteur : {selected.auteur}</div>}
              </div>
              <div className="flex gap-2.5 flex-wrap mb-3 sm:mb-4 items-center">
                <button onClick={()=>toggleFav(selected.id)}
                  className={`px-4 py-2 rounded-full text-[13.5px] font-[550] transition ${fav.includes(selected.id) ? 'bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,.35)]' : 'bg-zinc-800 text-zinc-200 active:bg-zinc-700'}`}>
                  ♥ {fav.includes(selected.id) ? 'Favori' : 'Ajouter aux favoris'}
                </button>
                <button onClick={()=>toggleIgnored(selected.id)}
                  className={`px-4 py-2 rounded-full text-[13.5px] font-[550] transition ${ignored.includes(selected.id) ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-400 active:bg-zinc-700'}`}>
                  ✕ {ignored.includes(selected.id) ? 'Ignoré' : 'Ignorer'}
                </button>
              </div>
              <div className="border-t border-zinc-800 pt-3.5 sm:pt-4 mt-3.5 sm:mt-4">
                <div className="text-[12px] text-zinc-500 mb-2.5">Placer dans mon planning :</div>
                <div className="flex gap-2 flex-wrap">
                  {SLOTS.map(slot => {
                    const ok = fitsSlot(selected, slot) && (playsOn(selected, slot.key.startsWith('12')?12:13))
                    return <button key={slot.key} disabled={!ok} onClick={() => { assignSlot(slot.key, selected.id); setSelected(null); setShowPlan(true)}}
                      className={`px-3.5 py-[7px] rounded-full text-[12px] border transition ${ok ? 'border-zinc-700 active:bg-zinc-800 text-zinc-300' : 'border-zinc-800/60 text-zinc-600'}`}>
                      {slot.dayShort} · {slot.label}
                    </button>
                  })}
                </div>
              </div>
              {selected.off_url && <a href={selected.off_url} target="_blank" className="text-rose-300 text-[13px] hover:underline block mt-4 sm:mt-5">Voir sur festivaloffavignon.com →</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
