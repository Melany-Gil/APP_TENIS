import { useEffect, useState } from 'react'
import { Trophy, Star } from 'lucide-react'
import { caddieService } from '../../services/caddieService'
import ActionDialog from '../common/ActionDialog'

const score = value => value == null ? 'Sin valoraciones' : `${Number(value).toLocaleString('es-CO',{minimumFractionDigits:2,maximumFractionDigits:2})} / 5`
export default function CaddieStandings() {
  const [dates,setDates]=useState({desde:'',hasta:''})
  const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
  const [retry,setRetry]=useState(0),[selected,setSelected]=useState(null)
  useEffect(()=>{
    let active=true
    setLoading(true);setError('');setData(null);setSelected(null)
    caddieService.standings(dates).then(r=>{if(active)setData(r.data)}).catch(e=>{if(active)setError(e.message || 'No se pudieron cargar las posiciones')}).finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[dates,retry])
  const leaders=data?.items.filter(r=>r.posicion===1)||[]
  const mostVotes=data?.items.length?Math.max(...data.items.map(r=>r.votos)):0
  return <section className='card p-4 sm:p-6 space-y-4' aria-label='Posiciones de caddies'>
    <div><h2 className='font-bold text-lg flex items-center gap-2'><Trophy size={20}/>Posiciones de caddies</h2><p className='text-xs text-[var(--text-muted)] mt-1'>Promedio de estrellas; en igualdad, mayor número de valoraciones. Si ambos coinciden, comparten posición.</p></div>
    <div className='grid grid-cols-2 gap-3'>{[['desde','Desde'],['hasta','Hasta']].map(([key,label])=><label className='text-sm min-w-0' key={key}>{label}<input type='date' className='form-input w-full mt-1 min-w-0' value={dates[key]} onChange={e=>setDates({...dates,[key]:e.target.value})}/></label>)}</div>
    <p className='text-xs text-[var(--text-muted)]'>Periodo según la fecha del partido. Sin fechas: todo el historial de partidos finalizados. Una persona puede valorar varios partidos.</p>
    {data?.alcance==='partidos_asignados' && <p className='rounded-xl p-3 bg-[var(--color-brand-dim)] text-sm'>Solo tus partidos asignados. La clasificación general está disponible para administración y dirección.</p>}
    {error?<p role='alert'>{error} <button className='underline' onClick={()=>setRetry(n=>n+1)}>Reintentar</button></p>:loading?<p role='status'>Cargando posiciones…</p>:!data?.items.length?<p>No hay calificaciones en este periodo.</p>:<>
      <div className='rounded-2xl p-5 border border-[var(--border-color)] bg-[var(--color-brand-dim)]'>
        <p className='text-xs font-bold uppercase tracking-wide text-[var(--color-brand)]'>{leaders.length>1?'Primer lugar compartido':'Mejor calificado'}</p>
        <h3 className='text-xl font-bold mt-2 break-words'>{leaders.map(r=>r.nombre).join(' · ')}</h3>
        <p className='mt-1 font-semibold'>{score(leaders[0]?.promedio)} <span className='font-normal text-sm'>· {leaders[0]?.votos} valoraciones {leaders.length>1?'cada uno':''}</span></p>
        <p className='text-xs mt-3 text-[var(--text-muted)]'>{data.votos} valoraciones en total · {data.items.length} caddies calificados</p>
      </div>
      <ol className='space-y-2'>{data.items.map(r=><li key={r.id} className='rounded-xl border border-[var(--border-color)] p-4 flex gap-3 items-start'>
        <span className='font-bold text-[var(--color-brand)] w-7 shrink-0'>#{r.posicion}</span>
        <div className='min-w-0 flex-1'><h3 className='font-semibold break-words'>{r.nombre}</h3><p className='text-sm flex items-center gap-1 mt-1'><Star size={14}/>{score(r.promedio)}</p><p className='text-xs text-[var(--text-muted)] mt-1'>{r.votos} valoraciones · {r.partidos} partidos evaluados</p>
        {r.votos===mostVotes && <span className='text-xs text-[var(--color-brand)]'>Mayor número de valoraciones</span>}
        <button className='block text-sm underline mt-3 min-h-10' onClick={()=>setSelected(r)}>Ver más detalles<span className='sr-only'> de {r.nombre}</span></button></div>
      </li>)}</ol>
      <p className='text-xs text-[var(--text-muted)]'>Clasificación informativa, sin mínimo de votos. Revisa el volumen de valoraciones antes de definir la premiación.</p>
    </>}
    {selected && <ActionDialog title={`Resumen de ${selected.nombre}`} onClose={()=>setSelected(null)}><div className='space-y-5'>
      <p className='text-xs text-[var(--text-muted)]'>{dates.desde||'Inicio del historial'} — {dates.hasta||'Hasta la fecha'} · {data.alcance==='global'?'Clasificación general':'Tus partidos asignados'}</p>
      <div className='grid grid-cols-2 gap-3'>{[['Promedio',score(selected.promedio)],['Valoraciones',selected.votos],['Partidos evaluados',selected.partidos],['Personas que valoraron',selected.evaluadores],['4 o 5 estrellas',`${selected.positivas.toFixed(1)} %`],['Posición',`#${selected.posicion}`]].map(([label,value])=><div key={label} className='rounded-xl p-3 bg-[var(--bg-hover)]'><span className='block text-xs text-[var(--text-muted)]'>{label}</span><strong className='block text-lg mt-1'>{value}</strong></div>)}</div>
      <section><h3 className='font-semibold mb-3'>Distribución de estrellas</h3>{[5,4,3,2,1].map(n=><div key={n} className='flex gap-3 items-center text-sm py-1'><span className='w-8 shrink-0'>{n} ★</span><progress className='flex-1 min-w-0 h-2 accent-[var(--color-brand)]' value={selected.estrellas[n-1]} max={selected.votos} aria-label={`${n} estrellas`}/><span className='w-20 shrink-0 text-right'>{selected.estrellas[n-1]} ({Math.round(100*selected.estrellas[n-1]/selected.votos)}%)</span></div>)}</section>
      <section className='border-t border-[var(--border-color)] pt-3 space-y-2'><h3 className='font-semibold'>Quiénes calificaron</h3><p className='text-sm'>Jugadores: {score(selected.promedio_jugadores)} · {selected.votos_jugadores} valoraciones</p><p className='text-sm'>Jueces: {score(selected.promedio_jueces)} · {selected.votos_jueces} valoraciones</p><p className='text-xs text-[var(--text-muted)]'>Cada valoración tiene el mismo peso. No se muestran identidades de los evaluadores.</p></section>
    </div></ActionDialog>}
  </section>
}
