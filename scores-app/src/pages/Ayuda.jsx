import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  Camera,
  CircleDot,
  Gavel,
  KeyRound,
  LayoutDashboard,
  LogIn,
  Pause,
  Radio,
  ShieldCheck,
  Star,
  Trophy,
  Undo2,
  UserRound,
  WifiOff,
} from 'lucide-react'
import { ArtCourt, ArtDirector, ArtFormat, ArtJudge, ArtLogin, ArtPanel, ArtScore } from '../components/help/HelpArt'

export default function Ayuda() {
  const [tab, setTab] = useState('miembro')
  const isMember = tab === 'miembro'

  return (
    <div className='space-y-6 animate-fade-up'>
      <section className='hero-panel'>
        <p className='hero-kicker'>Club Unión · Guía de uso</p>
        <h1 className='text-2xl sm:text-4xl font-black mt-3' style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          Aprende a usar la app, paso a paso
        </h1>
        <p className='text-sm mt-3 max-w-xl' style={{ color: 'rgba(255,255,255,.75)' }}>
          Instructivo para miembros y jueces del Subcomité de Tenis. Las ilustraciones son animadas
          y sirven de mapa: los pasos y botones son los reales de la aplicación.
        </p>
        <div className='tabs mt-5 max-w-md' role='tablist' aria-label='Elige tu guía'>
          <button
            type='button'
            role='tab'
            aria-selected={isMember}
            className={`tab-item ${isMember ? 'active' : ''}`}
            onClick={() => setTab('miembro')}
          >
            <span className='inline-flex items-center gap-2 justify-center'><UserRound size={15} /> Miembros</span>
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={!isMember}
            className={`tab-item ${!isMember ? 'active' : ''}`}
            onClick={() => setTab('juez')}
          >
            <span className='inline-flex items-center gap-2 justify-center'><Gavel size={15} /> Jueces</span>
          </button>
        </div>
      </section>

      {isMember ? <MemberGuide /> : <JudgeGuide />}
    </div>
  )
}

/* ── Estructura compartida ─────────────────────────── */

function Step({ n, icon: Icon, title, children, art, tip }) {
  return (
    <section className='card p-5 sm:p-6'>
      <div className='flex items-start gap-3'>
        <span className='form-win' style={{ width: 30, height: 30, fontSize: 13 }}>{n}</span>
        <div className='flex-1 min-w-0'>
          <h2 className='font-bold text-base flex items-center gap-2' style={{ color: 'var(--text-primary)' }}>
            {Icon && <Icon size={17} style={{ color: 'var(--color-brand)' }} />} {title}
          </h2>
          <div className='text-sm mt-2 space-y-2' style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {children}
          </div>
        </div>
      </div>
      {art && <div className='mt-4'>{art}</div>}
      {tip && (
        <p className='text-xs mt-4 rounded-xl px-3 py-2.5' style={{ backgroundColor: 'var(--color-brand-dim)', color: 'var(--color-brand)', lineHeight: 1.6 }}>
          <strong>Consejo: </strong>{tip}
        </p>
      )}
    </section>
  )
}

function QuickNav({ items }) {
  return (
    <nav className='card p-4' aria-label='Contenido de la guía'>
      <p className='text-xs font-bold uppercase tracking-widest mb-2' style={{ color: 'var(--text-muted)' }}>En esta guía</p>
      <div className='flex flex-wrap gap-2'>
        {items.map((item) => (
          <a key={item.href} href={item.href} className='btn-secondary text-xs px-3 py-2'>{item.label}</a>
        ))}
      </div>
    </nav>
  )
}

/* ── Guía del miembro ──────────────────────────────── */

function MemberGuide() {
  return (
    <div className='space-y-4'>
      <QuickNav items={[
        { href: '#m-cuenta', label: '1 · Tu cuenta' },
        { href: '#m-ingreso', label: '2 · Ingresar' },
        { href: '#m-datos', label: '3 · Completa tus datos' },
        { href: '#m-panel', label: '4 · Mi panel' },
        { href: '#m-vivo', label: '5 · En vivo y detalle' },
        { href: '#m-perfil', label: '6 · Perfil y favoritos' },
        { href: '#m-clave', label: '7 · Contraseña' },
      ]} />

      <div id='m-cuenta'>
        <Step
          n='1'
          icon={UserRound}
          title='Tu cuenta la crea el administrador'
          tip='Si no tienes acceso o no registraste correo, contacta al administrador del club.'
        >
          <p>
            No hay registro público: el administrador crea tu cuenta desde <strong>Administración → Usuarios</strong> con
            tus nombres, un usuario único y una contraseña temporal. Celular, correo y cédula pueden venir vacíos.
          </p>
          <p>
            Tu cuenta puede estar <strong>vinculada a tu ficha de jugador</strong>: así tu panel muestra tu agenda,
            tus partidos en vivo y tu historial automáticamente.
          </p>
        </Step>
      </div>

      <div id='m-ingreso'>
        <Step
          n='2'
          icon={LogIn}
          title='Ingresa con usuario, correo o celular'
          art={<ArtLogin />}
          tip='Usa cualquiera de los datos que tengas registrado más tu contraseña. El celular siempre pide contraseña: no es verificación por SMS.'
        >
          <p>
            Ve a <strong>Iniciar sesión</strong> y usa el acceso general: escribe tu <strong>usuario, correo o celular</strong> y
            tu <strong>contraseña</strong>. También funciona tu documento si tu cuenta lo tiene registrado.
          </p>
          <p>
            El enlace <strong>“Ingresar como juez”</strong> es solo para jueces y juez director: si eres miembro, quédate
            en el ingreso general. Al entrar llegarás a <strong>Mi panel</strong>.
          </p>
        </Step>
      </div>

      <div id='m-datos'>
        <Step
          n='3'
          icon={CircleDot}
          title='Completa tu correo y documento la primera vez'
          tip='Sin estos datos no podrás recuperar tu contraseña por correo. Guárdalos una vez y no te los pedimos más.'
        >
          <p>
            Si tu cuenta se creó sin <strong>correo</strong> o sin <strong>documento</strong>, al ingresar verás el
            diálogo <strong>“Completa tus datos”</strong>. Es obligatorio: la app lo seguirá mostrando hasta que lo guardes.
          </p>
          <p>
            El correo debe ser único y válido; el documento, solo dígitos (5 a 20). Si ya tienes documento registrado y
            necesitas corregirlo, pídelo al administrador.
          </p>
        </Step>
      </div>

      <div id='m-panel'>
        <Step
          n='4'
          icon={LayoutDashboard}
          title='Mi panel: tu agenda y tu balance'
          art={<ArtPanel />}
          tip='Si ves “Cuenta sin jugador vinculado”, pide al administrador que asocie tu usuario con tu ficha de jugador.'
        >
          <p>
            Tu inicio muestra <strong>Estás en cancha</strong> o <strong>Tu próximo partido</strong>, tu balance
            <strong> (finalizados, victorias, derrotas y %)</strong> filtrable por torneo, y tus pestañas
            de <strong>Próximos</strong> e <strong>Historial</strong>.
          </p>
          <p>
            En el historial, cada resultado indica <strong>Victoria / Derrota</strong> y la modalidad
            (<strong>Individual / Dobles</strong>). Toca <strong>“Ver estadísticas y comparación”</strong> para el detalle.
          </p>
        </Step>
      </div>

      <div id='m-vivo'>
        <Step
          n='5'
          icon={Radio}
          title='Sigue el vivo y abre el detalle del partido'
          art={<><ArtScore /><div className='mt-3'><ArtCourt /></div></>}
          tip='En la pantalla gigante del club (/pantalla) ves la jornada sin la cancha ilustrada; en el detalle del partido sí aparece.'
        >
          <p>
            En <strong>En vivo</strong> ves los partidos en juego con marcador por sets y punto actual, actualizados en
            tiempo real. Toca un partido para abrir su <strong>detalle</strong>: marcador, sets, punto a punto,
            <strong> estadística comparativa</strong>, foto de la malla, cancha ilustrativa y observaciones.
          </p>
          <p>
            Los partidos <strong>finalizados</strong> quedan con su marcador y sus estadísticas; los
            <strong> cancelados</strong> no cuentan en tu balance.
          </p>
        </Step>
      </div>

      <div id='m-perfil'>
        <Step
          n='6'
          icon={Star}
          title='Favoritos, perfil, avisos y pantalla del club'
        >
          <p>
            <strong>Favoritos:</strong> guarda jugadores, parejas, partidos y torneos con la estrella para
            encontrarlos rápido.
          </p>
          <p>
            <strong>Mi perfil:</strong> edita nombre, correo y celular, cambia o quita tu <strong>foto</strong> (JPG, PNG o
            WebP, máx. 2 MB) y cambia tu contraseña. Tu documento solo lo corrige el administrador.
          </p>
          <p>
            <strong>Avisos</strong> trae las noticias del club con imágenes; la <strong>pantalla (/pantalla)</strong> muestra
            la jornada en grande para el televisor del club.
          </p>
        </Step>
      </div>

      <div id='m-clave'>
        <Step
          n='7'
          icon={KeyRound}
          title='Si olvidas tu contraseña'
          tip='El código vence en 15 minutos. Si no tienes correo registrado, el administrador debe restablecer tu clave.'
        >
          <p>
            En <strong>“¿Olvidaste tu contraseña?”</strong> escribe tu correo y recibirás un <strong>código de 6
            dígitos</strong>. Verifícalo y define tu clave nueva (mínimo 8 caracteres, una mayúscula y un número).
          </p>
          <p>
            Con sesión abierta, cámbiala cuando quieras en <strong>Mi perfil → Cambiar contraseña</strong> escribiendo la actual.
          </p>
          <div className='flex flex-wrap gap-2 pt-1'>
            <Link to='/login' className='btn-primary text-xs px-4 py-2.5'>Ir a iniciar sesión</Link>
            <Link to='/live' className='btn-secondary text-xs px-4 py-2.5'>Ver partidos en vivo</Link>
          </div>
        </Step>
      </div>
    </div>
  )
}

/* ── Guía del juez ─────────────────────────────────── */

function JudgeGuide() {
  return (
    <div className='space-y-4'>
      <QuickNav items={[
        { href: '#j-ingreso', label: '1 · Ingresar como juez' },
        { href: '#j-mesa', label: '2 · Mesa de partidos' },
        { href: '#j-saque', label: '3 · Saque e inicio' },
        { href: '#j-control', label: '4 · Control punto a punto' },
        { href: '#j-foto', label: '5 · Fotos y cierre' },
        { href: '#j-offline', label: '6 · Sin conexión' },
        { href: '#j-director', label: '7 · Juez director' },
      ]} />

      <div id='j-ingreso'>
        <Step
          n='1'
          icon={LogIn}
          title='Ingresa con el acceso de juez'
          art={<ArtLogin />}
          tip='Tu cuenta de juez la crea un administrador, que también te asigna los partidos.'
        >
          <p>
            En <strong>Iniciar sesión</strong> toca <strong>“Ingresar como juez”</strong>: el formulario cambia a
            <strong> nombre de usuario y contraseña</strong> (no correo ni celular). Entrarás directo a tu
            <strong> mesa (/juez)</strong>.
          </p>
          <p>
            Solo verás la mesa, tu perfil y patrocinadores: la navegación pública queda restringida mientras tu
            sesión es de juez.
          </p>
        </Step>
      </div>

      <div id='j-mesa'>
        <Step
          n='2'
          icon={LayoutDashboard}
          title='Tu mesa: partidos asignados'
          art={<ArtPanel />}
          tip='Solo el juez asignado y los administradores pueden modificar el tanteo de un partido.'
        >
          <p>
            La mesa lista <strong>tus partidos asignados</strong> con día, hora, cancha, categoría y modalidad. Toca uno
            para abrir su <strong>control de cancha</strong>.
          </p>
          <p>
            Desde <strong>Ajustes</strong> puedes corregir el sacador y los nombres que se muestran en pantalla (solo la
            etiqueta, no sustituye al jugador). Si un partido no es tuyo, no podrás anotar en él.
          </p>
        </Step>
      </div>

      <div id='j-saque'>
        <Step
          n='3'
          icon={CircleDot}
          title='Antes del primer punto: saque, formato e inicio'
          art={<><ArtServe /><div className='mt-3'><ArtFormat /></div></>}
          tip='El formato lo define el torneo al crear el partido y se conserva: desde la mesa no se edita.'
        >
          <p>
            Quién saca primero ya viene definido en el partido como <strong>servidor inicial</strong>. Verifícalo y, solo
            si es necesario, corrígelo con <strong>“Cambiar saque”</strong> en Ajustes. El saque cambia solo game a game.
          </p>
          <p>
            Cuando todo esté listo toca <strong>Iniciar partido</strong>: el cronómetro y el marcador en vivo empiezan a
            correr para todo el club. Si necesitas detener, usa <strong>Pausar</strong> y luego <strong>Reanudar</strong>.
          </p>
        </Step>
      </div>

      <div id='j-control'>
        <Step
          n='4'
          icon={Gavel}
          title='Control punto a punto'
          art={<ArtJudge />}
          tip='Si te equivocas, usa Deshacer: anula la última acción sin borrarla del historial de auditoría.'
        >
          <p>
            En modo <strong>rápido</strong> el punto se suma sin clasificar el motivo; activa el
            <strong> detalle</strong> para indicar cómo terminó: ace, tiro ganador, error
            forzado o no forzado, doble falta, penalización o infracción. Marca <strong>primera falta</strong>
            (sin punto) y <strong>let</strong> (se repite el saque) cuando corresponda.
          </p>
          <p className='flex flex-wrap gap-2'>
            <span className='badge-brand'>Ace solo al sacador</span>
            <span className='badge-brand'>Doble falta = punto al resto</span>
            <span className='badge-brand'>Pausa cuando lo necesites</span>
          </p>
        </Step>
      </div>

      <div id='j-foto'>
        <Step
          n='5'
          icon={Camera}
          title='Fotos de inicio y final, y cierre'
          tip='La foto de la malla con el marcador es la que ven los miembros en el detalle del partido.'
        >
          <p>
            Captura la <strong>foto de inicio y de final</strong> desde el control. Al confirmarse el punto de partido,
            el resultado se registra solo y el encuentro pasa a <strong>finalizado</strong> con sus estadísticas.
          </p>
          <p>
            Las estadísticas (aces, quiebres, primer saque, rachas) se calculan únicamente con los puntos registrados:
            las correcciones supervisadas no inventan puntos.
          </p>
        </Step>
      </div>

      <div id='j-offline'>
        <Step
          n='6'
          icon={WifiOff}
          title='Si se cae internet, sigue anotando'
          tip='No cierres la pestaña a mitad de partido: tu cola vive en este navegador hasta sincronizarse.'
        >
          <p>
            Cada acción se guarda en una <strong>cola local ordenada</strong> y se envía sola al recuperar la conexión.
            Verás el aviso <strong><WifiOff size={13} className='inline' /> Sin conexión · acciones en cola</strong> y el
            conteo pendiente.
          </p>
          <p>
            Si un supervisor corrigió el partido mientras estabas offline, tu cola queda <strong>en revisión</strong>:
            no se aplica en silencio, debes revisarla con el juez director.
          </p>
        </Step>
      </div>

      <div id='j-director'>
        <Step
          n='7'
          icon={ShieldCheck}
          title='Juez director: supervisión y correcciones'
          art={<ArtDirector />}
          tip='Para corregir un partido en vivo, primero páusalo desde la mesa y reanúdalo después de guardar.'
        >
          <p>
            Desde <strong>/director</strong> reasignas jueces (solo programados o en vivo), <strong>sustituyes</strong> participantes
            antes del inicio, y <strong>cancelas o reactivas</strong> encuentros. Reactivar uno que ya comenzó lo deja
            <strong> en vivo pausado</strong> para revisión.
          </p>
          <p>
            La <strong>corrección de sets</strong> pide motivo y sacador, reinicia el game parcial en 0-0 y queda registrada
            en <strong>auditoría</strong> con quién la hizo. Un resultado finalizado debe concordar con sets y formato.
          </p>
          <div className='flex flex-wrap gap-2 pt-1'>
            <span className='badge-brand'><Trophy size={12} /> Finalizados no se cancelan</span>
            <span className='badge-brand'><Undo2 size={12} /> La corrección no se deshace: se corrige de nuevo</span>
            <span className='badge-brand'><Pause size={12} /> Pausa antes de corregir</span>
            <span className='badge-brand'><Bell size={12} /> Todo queda auditado</span>
          </div>
          <div className='flex flex-wrap gap-2 pt-2'>
            <Link to='/login' className='btn-primary text-xs px-4 py-2.5'>Ir a ingresar como juez</Link>
            <Link to='/pantalla' className='btn-secondary text-xs px-4 py-2.5'>Ver pantalla del club</Link>
          </div>
        </Step>
      </div>
    </div>
  )
}
