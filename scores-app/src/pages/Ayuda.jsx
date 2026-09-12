import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'
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
import './Ayuda.css'
import {
  ArtCourt,
  ArtDirector,
  ArtFormat,
  ArtJudge,
  ArtLogin,
  ArtPanel,
  ArtScore,
  ArtServe,
} from '../components/help/HelpArt'

export default function Ayuda() {
  const userRol = useAuthStore((store) => store.user?.rol)
  const official = ['juez', 'juez_director'].includes(userRol)
  const [tab, setTab] = useState(official ? 'juez' : 'miembro')
  const [paused, setPaused] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  useEffect(() => {
    const update = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  const isMember = !official && tab === 'miembro'
  return (
    <div className={`help-guide ${paused || hidden ? 'help-motion-paused' : ''}`}>
      <div className='help-atmosphere' aria-hidden='true'>
        <div className='help-orbit-ball' />
      </div>
      <section className='help-hero'>
        <div className='help-hero-copy'>
          <p className='help-eyebrow'>SUBCOMITÉ DE TENIS · CLUB UNIÓN</p>
          <h1>
            Más juego.
            <br />
            <em>Menos dudas.</em>
          </h1>
          <p className='help-hero-description'>
            Tu guía de cancha, dentro y fuera del partido. Encuentra lo que necesitas y vuelve a
            disfrutar el tenis.
          </p>
          <div className='help-guide-selector' aria-label='Elige tu guía'>
            {!official && (
              <button aria-pressed={isMember} onClick={() => setTab('miembro')}>
                <UserRound size={16} /> Miembros
              </button>
            )}
            <button aria-pressed={!isMember} onClick={() => setTab('juez')}>
              <Gavel size={16} /> Jueces
            </button>
          </div>
          <button
            className='help-motion-toggle'
            aria-pressed={paused}
            onClick={() => setPaused((v) => !v)}
          >
            {paused ? 'Activar animaciones' : 'Pausar animaciones'}
          </button>
        </div>
        <div className='help-hero-art' aria-hidden='true'>
          <div className='help-hero-court'>
            <span />
            <i />
            <b />
          </div>
          <p>
            POLVO DE LADRILLO
            <br />
            <strong>Pasión por cada punto.</strong>
          </p>
        </div>
      </section>
      <div className='help-intro'>
        <span className='help-section-tag'>
          {isMember ? 'TU EXPERIENCIA' : 'CONTROL DE CANCHA'}
        </span>
        <p>Elige un tema. Los esquemas son ejemplos ilustrativos, no partidos reales.</p>
      </div>
      {isMember ? <MemberGuide /> : <JudgeGuide />}
      <HelpQuestions official={official} />
      {userRol === 'admin' && (
        <section className='help-step card p-5'>
          <h2 className='font-bold'>También eres administrador</h2>
          <p className='text-sm mt-2'>
            En Administración gestionas usuarios, jugadores, parejas, torneos, partidos, sedes y
            avisos. En Tickets respondes las solicitudes de los jueces. Si una eliminación está
            bloqueada, lee el motivo: conserva el historial y desactiva la cuenta cuando
            corresponda.
          </p>
          <Link className='btn-secondary inline-flex mt-3 px-4 py-2' to='/admin'>
            Abrir administración
          </Link>
        </section>
      )}
    </div>
  )
}

/* ── Estructura compartida ─────────────────────────── */

function Step({ n, icon: Icon, title, children, art, tip }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return (
    <section ref={ref} data-visible={visible} className='help-step card p-5 sm:p-6'>
      <div className='flex items-start gap-3'>
        <span className='form-win' style={{ width: 30, height: 30, fontSize: 13 }}>
          {n}
        </span>
        <div className='flex-1 min-w-0'>
          <h2
            className='font-bold text-base flex items-center gap-2'
            style={{ color: 'var(--text-primary)' }}
          >
            {Icon && <Icon size={17} style={{ color: 'var(--color-brand)' }} />} {title}
          </h2>
          <div
            className='text-sm mt-2 space-y-2'
            style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
          >
            {children}
          </div>
        </div>
      </div>
      {art && <div className='mt-4'>{art}</div>}
      {tip && (
        <p
          className='text-xs mt-4 rounded-xl px-3 py-2.5'
          style={{
            backgroundColor: 'var(--color-brand-dim)',
            color: 'var(--color-brand)',
            lineHeight: 1.6,
          }}
        >
          <strong>Consejo: </strong>
          {tip}
        </p>
      )}
    </section>
  )
}

function QuickNav({ items }) {
  return (
    <nav className='help-index card p-4' aria-label='Contenido de la guía'>
      <p
        className='text-xs font-bold uppercase tracking-widest mb-2'
        style={{ color: 'var(--text-muted)' }}
      >
        En esta guía
      </p>
      <div className='flex flex-wrap gap-2'>
        {items.map((item) => (
          <a key={item.href} href={item.href} className='btn-secondary text-xs px-3 py-2'>
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

/* ── Guía del miembro ──────────────────────────────── */

function MemberGuide() {
  return (
    <div className='space-y-4'>
      <QuickNav
        items={[
          { href: '#m-cuenta', label: '1 · Tu cuenta' },
          { href: '#m-ingreso', label: '2 · Ingresar' },
          { href: '#m-datos', label: '3 · Completa tus datos' },
          { href: '#m-panel', label: '4 · Mi panel' },
          { href: '#m-vivo', label: '5 · En vivo y detalle' },
          { href: '#m-perfil', label: '6 · Perfil y favoritos' },
          { href: '#m-clave', label: '7 · Contraseña' },
        ]}
      />

      <div id='m-cuenta'>
        <Step
          n='1'
          icon={UserRound}
          title='Tu cuenta la crea el administrador'
          tip='Si no tienes acceso o no registraste correo, contacta al administrador del club.'
        >
          <p>
            No hay registro público: el administrador crea tu cuenta desde{' '}
            <strong>Administración → Usuarios</strong> con tus nombres, un usuario único y una
            contraseña inicial que luego podrás cambiar en tu perfil. Celular, correo y cédula
            pueden venir vacíos.
          </p>
          <p>
            Tu cuenta puede estar <strong>vinculada a tu ficha de jugador</strong>: así tu panel
            muestra tu agenda, tus partidos en vivo y tu historial automáticamente.
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
            Ve a <strong>Iniciar sesión</strong> y usa el acceso general: escribe tu{' '}
            <strong>usuario, correo o celular</strong> y tu <strong>contraseña</strong>. También
            funciona tu documento si tu cuenta lo tiene registrado.
          </p>
          <p>
            El enlace <strong>“Ingresar como juez”</strong> es solo para jueces y juez director: si
            eres miembro, quédate en el ingreso general. Al entrar llegarás a{' '}
            <strong>Mi panel</strong>.
          </p>
        </Step>
      </div>

      <div id='m-datos'>
        <Step
          n='3'
          icon={CircleDot}
          title='Completa tu correo y documento la primera vez'
          tip='El correo permite recuperar tu contraseña; el documento identifica tu cuenta. Si alguno ya está registrado en otra cuenta, consulta al administrador.'
        >
          <p>
            Si tu cuenta se creó sin <strong>correo</strong> o sin <strong>documento</strong>, al
            ingresar verás el diálogo <strong>“Completa tus datos”</strong>. Es obligatorio: la app
            lo seguirá mostrando hasta que lo guardes.
          </p>
          <p>
            El correo debe ser único y válido; el documento, solo dígitos (5 a 20). Si ya tienes
            documento registrado y necesitas corregirlo, pídelo al administrador.
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
            Tu inicio muestra <strong>Estás en cancha</strong> o <strong>Tu próximo partido</strong>
            , tu balance
            <strong> (finalizados, victorias, derrotas y %)</strong> filtrable por torneo, y tus
            pestañas de <strong>Próximos</strong> e <strong>Historial</strong>.
          </p>
          <p>
            En el historial, cada resultado indica <strong>Victoria / Derrota</strong> y la
            modalidad (<strong>Individual / Dobles</strong>). Toca{' '}
            <strong>“Ver estadísticas y comparación”</strong> para el detalle.
          </p>
        </Step>
      </div>

      <div id='m-vivo'>
        <Step
          n='5'
          icon={Radio}
          title='Sigue el vivo y abre el detalle del partido'
          art={
            <>
              <ArtScore />
              <div className='mt-3'>
                <ArtCourt />
              </div>
            </>
          }
          tip='En la pantalla gigante del club (/pantalla) ves la jornada sin la cancha ilustrada; en el detalle del partido sí aparece.'
        >
          <p>
            En <strong>En vivo</strong> ves los partidos en juego con marcador por sets y punto
            actual, actualizados en tiempo real. Toca un partido para abrir su{' '}
            <strong>detalle</strong>: marcador, sets,
            <strong> estadística comparativa</strong>, foto del partido si ya fue subida, cancha
            ilustrativa y observaciones cuando existan.
          </p>
          <p>
            Los partidos <strong>finalizados</strong> quedan con su marcador y sus estadísticas; los
            <strong> cancelados</strong> no cuentan en tu balance.
          </p>
        </Step>
      </div>

      <div id='m-perfil'>
        <Step n='6' icon={Star} title='Favoritos, perfil, avisos y pantalla del club'>
          <p>
            <strong>Favoritos:</strong> guarda jugadores, parejas y partidos con la estrella para
            encontrarlos rápido. Esta selección se guarda en este navegador; no presupongas que aparece en otro dispositivo.
          </p>
          <p>
            <strong>Mi perfil:</strong> edita nombre, correo y celular, cambia o quita tu{' '}
            <strong>foto</strong> (JPG, PNG o WebP, máx. 2 MB) y cambia tu contraseña. Tu documento
            solo lo corrige el administrador.
          </p>
          <p>
            <strong>Avisos</strong> trae las noticias del club con imágenes; la{' '}
            <strong>pantalla (/pantalla)</strong> muestra la jornada en grande para el televisor del
            club.
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
            En <strong>“¿Olvidaste tu contraseña?”</strong> escribe tu correo y recibirás un{' '}
            <strong>código de 6 dígitos</strong>. Verifícalo y define tu clave nueva (mínimo 8
            caracteres, una mayúscula y un número).
          </p>
          <p>
            Con sesión abierta, cámbiala cuando quieras en{' '}
            <strong>Mi perfil → Cambiar contraseña</strong> escribiendo la actual. Después tendrás que iniciar sesión con la nueva clave.
          </p>
          <div className='flex flex-wrap gap-2 pt-1'>
            <Link to='/login' className='btn-primary text-xs px-4 py-2.5'>
              Ir a iniciar sesión
            </Link>
            <Link to='/live' className='btn-secondary text-xs px-4 py-2.5'>
              Ver partidos en vivo
            </Link>
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
      <QuickNav
        items={[
          { href: '#j-ingreso', label: '1 · Ingresar como juez' },
          { href: '#j-mesa', label: '2 · Mesa de partidos' },
          { href: '#j-saque', label: '3 · Saque e inicio' },
          { href: '#j-control', label: '4 · Control punto a punto' },
          { href: '#j-foto', label: '5 · Fotos y cierre' },
          { href: '#j-offline', label: '6 · Sin conexión' },
          { href: '#j-director', label: '7 · Juez director' },
          { href: '#j-soporte', label: '8 · Soporte y avisos' },
        ]}
      />

      <div id='j-ingreso'>
        <Step
          n='1'
          icon={LogIn}
          title='Ingresa con el acceso de juez'
          art={<ArtLogin />}
          tip='Tu cuenta de juez la crea un administrador, que también te asigna los partidos.'
        >
          <p>
            En <strong>Iniciar sesión</strong> toca <strong>“Ingresar como juez”</strong>: el
            formulario cambia a<strong> nombre de usuario y contraseña</strong> (no correo ni
            celular). Entrarás directo a tu
            <strong> mesa (/juez)</strong>.
          </p>
          <p>
            Tendrás acceso a la mesa, tu perfil, Ayuda, Soporte y la campana de notificaciones, sin
            patrocinadores. Si eres juez director, entrarás a tu panel de supervisión y también
            podrás abrir la mesa.
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
            La mesa lista <strong>tus partidos asignados</strong> con día, hora, cancha, categoría y
            modalidad. Toca uno para abrir su <strong>control de cancha</strong>.
          </p>
          <p>
            Desde <strong>Ajustes</strong> puedes corregir el sacador y los nombres que se muestran
            en pantalla (solo la etiqueta, no sustituye al jugador). Si un partido no es tuyo, no
            podrás anotar en él.
          </p>
        </Step>
      </div>

      <div id='j-saque'>
        <Step
          n='3'
          icon={CircleDot}
          title='Antes del primer punto: saque, formato e inicio'
          art={
            <>
              <ArtServe />
              <div className='mt-3'>
                <ArtFormat />
              </div>
            </>
          }
          tip='El formato lo define el torneo al crear el partido y se conserva: desde la mesa no se edita.'
        >
          <p>
            Quién saca primero ya viene definido en el partido como{' '}
            <strong>servidor inicial</strong>. El saque cambia automáticamente según el
            formato, incluidos tie-breaks. Si el sacador inicial no coincide, pide revisarlo antes
            de empezar; durante el juego puedes usar <strong>“Cambiar saque”</strong> en Ajustes cuando el control esté habilitado.
          </p>
          <p>
            Cuando todo esté listo toca <strong>Iniciar partido</strong>: el cronómetro y el
            marcador en vivo empiezan a correr para todo el club. Si necesitas detener, usa{' '}
            <strong>Pausar</strong> y luego <strong>Reanudar</strong>.
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
            <strong> detalle</strong> para indicar cómo terminó: ace, tiro ganador, error forzado o
            no forzado, doble falta, penalización o infracción. Marca <strong>primera falta</strong>
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
          title='Una foto del partido y confirmación del resultado'
          tip='Una foto guardada en el dispositivo todavía no está publicada. Espera la confirmación de envío.'
        >
          <p>
            Desde <strong>Foto</strong>, toma o selecciona{' '}
            <strong>una sola foto del partido</strong>, al inicio o al final. Indica el momento y
            confirma que tienes autorización para mostrarla en el detalle público. Reemplazarla
            sustituye la anterior, no añade una segunda. Al confirmarse el punto de partido, el
            resultado se registra solo y el encuentro pasa a <strong>finalizado</strong> con sus
            estadísticas.
          </p>
          <p>
            Las estadísticas de puntos, aces, saques y errores se calculan con las acciones
            registradas: las correcciones supervisadas no inventan puntos.
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
            Con el partido ya abierto e iniciado, las acciones de puntuación se guardan en una{' '}
            <strong>cola local ordenada</strong> y se envía sola al recuperar la conexión. Verás el
            aviso <strong>“Sin conexión · los puntos se guardarán aquí”</strong> y el conteo
            pendiente.
          </p>
          <p>
            Si un supervisor corrigió el partido mientras estabas offline, tu cola queda{' '}
            <strong>en revisión</strong>: no se aplica en silencio, debes revisarla con el juez
            director. No repitas puntos ya guardados. La pantalla pública solo recibe los puntos
            confirmados por el servidor; espera a que no queden pendientes antes de salir. Iniciar,
            pausar y otros cambios de control requieren conexión.
          </p>
        </Step>
      </div>

      <div id='j-director'>
        <Step
          n='7'
          icon={ShieldCheck}
          title='Juez director: supervisión y correcciones'
          art={<ArtDirector />}
          tip='Coordina la pausa con el juez asignado o un administrador antes de corregir un partido en vivo.'
        >
          <p>
            Desde <strong>/director</strong> reasignas jueces (solo programados o en vivo),{' '}
            <strong>sustituyes</strong> participantes antes del inicio, y{' '}
            <strong>cancelas o reactivas</strong> encuentros. Reactivar uno que ya comenzó lo deja
            <strong> en vivo pausado</strong> para revisión.
          </p>
          <p>
            La <strong>corrección de sets</strong> pide motivo y sacador, reinicia el game parcial
            en 0-0 y queda registrada en <strong>auditoría</strong> con quién la hizo. Un resultado
            finalizado debe concordar con sets y formato.
          </p>
          <div className='flex flex-wrap gap-2 pt-1'>
            <span className='badge-brand'>
              <Trophy size={12} /> Finalizados no se cancelan
            </span>
            <span className='badge-brand'>
              <Undo2 size={12} /> La corrección no se deshace: se corrige de nuevo
            </span>
            <span className='badge-brand'>
              <Pause size={12} /> Pausa antes de corregir
            </span>
            <span className='badge-brand'>
              <Bell size={12} /> Todo queda auditado
            </span>
          </div>
          <div className='flex flex-wrap gap-2 pt-2'>
            <JudgeHelpLinks />
          </div>
        </Step>
      </div>
      <div id='j-soporte'>
        <Step
          n='8'
          icon={Bell}
          title='Soporte y notificaciones'
          tip='Una solicitud urgente no reemplaza avisar directamente al director de torneo.'
        >
          <p>
            Abre <strong>Soporte → Nueva solicitud</strong>. Indica asunto, tipo, prioridad y qué
            ocurrió. Puedes consultar tus solicitudes y las respuestas de administración. Envía con
            conexión; si falla, conserva el formulario abierto y reintenta.
          </p>
          <p>
            La <strong>campana</strong> muestra avisos de soporte. Si el servidor está configurado,
            puedes <strong>Activar push</strong> para recibirlos en el dispositivo, con tu permiso.
            No son recordatorios de partidos. Puedes desactivarlos o renovar la activación; la
            entrega depende del navegador y de la red.
          </p>
          <p>
            En iPhone, añade primero la web a la pantalla de inicio y ábrela desde allí. Si push no
            está disponible, sigue consultando la campana y Soporte.
          </p>
        </Step>
      </div>
    </div>
  )
}

function JudgeHelpLinks() {
  const role = useAuthStore((s) => s.user?.rol)
  return ['admin', 'juez', 'juez_director'].includes(role) ? (
    <Link to='/soporte' className='btn-primary text-xs px-4 py-2.5'>
      Abrir soporte
    </Link>
  ) : (
    <Link to='/login' className='btn-primary text-xs px-4 py-2.5'>
      Ir al ingreso
    </Link>
  )
}
function HelpQuestions({ official }) {
  return (
    <section className='help-faq'>
      <p className='help-section-tag'>A MANO, CUANDO LO NECESITES</p>
      <h2 className='text-2xl font-bold mb-4'>Dudas frecuentes</h2>
      {(official
        ? [
            [
              '¿La pantalla del club no muestra mis últimos puntos?',
              'Revisa el contador de pendientes y la conexión en la mesa. Los puntos locales todavía no son públicos. Mantén el partido abierto hasta sincronizar; no borres datos del navegador ni cambies de dispositivo con acciones pendientes.',
            ],
            [
              '¿Puedo usar dos celulares para el mismo partido?',
              'Evítalo. Usa un dispositivo a la vez. Si aparece un conflicto, conserva los pendientes y coordina la revisión con el director; no vuelvas a anotar todos los puntos.',
            ],
            [
              '¿Mi foto no aparece?',
              'Una foto pendiente solo está en tu dispositivo. Mantén el partido abierto para reintentar. Si hay un rechazo o conflicto, revisa el mensaje antes de reemplazar o descartar algo.',
            ],
          ]
        : [
            [
              '¿Por qué no aparecen mis partidos?',
              'La cuenta debe estar vinculada al jugador correcto. Comprueba el filtro de torneo de Mi panel y pide al administrador revisar el vínculo; no crees una cuenta duplicada.',
            ],
            [
              '¿Cómo leo las estadísticas?',
              'En el detalle puedes alternar gráficos y tabla y filtrar por set. En dobles, los datos son de cada pareja completa, no individuales. Un punto rápido sin motivo no permite identificar un ace o un tiro ganador. No confundas falta de clasificación con un rendimiento de cero.',
            ],
            [
              '¿Por qué cambió el marcador pero no las estadísticas?',
              'Las correcciones supervisadas ajustan el marcador, pero no inventan acciones punto a punto. La app señala esas correcciones. Si la conexión falla, espera la actualización; no necesitas cerrar sesión.',
            ],
            [
              '¿Puedo inscribirme o buscar rivales desde aquí?',
              'Por ahora no. La programación y las inscripciones se coordinan con la organización. La app permite consultar tus partidos, resultados, perfil y avisos.',
            ],
          ]
      ).map(([q, a]) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
    </section>
  )
}
