import './HelpArt.css'

/* Ilustraciones animadas solo con CSS/SVG y variables del tema.
   Respetan prefers-reduced-motion (ver HelpArt.css). */

export function ArtLogin() {
  return (
    <div className='help-art' aria-hidden='true'>
      <div className='help-phone'>
        <p className='help-phone-title'>Bienvenido</p>
        <div className='help-field'>
          <span className='help-field-dot' />
          <span className='help-typing'>ana.garcia<span className='help-caret' /></span>
        </div>
        <div className='help-field'>
          <span className='help-field-dot' />
          <span className='help-pass'>••••••••</span>
        </div>
        <div className='help-btn'>Iniciar sesión</div>
        <div className='help-toast'>¡Bienvenida, Ana!</div>
      </div>
    </div>
  )
}

export function ArtPanel() {
  return (
    <div className='help-art help-row' aria-hidden='true'>
      <div className='help-mini'>
        <span className='help-mini-tag'>Próximo</span>
        <strong>Sáb · 10:00</strong>
        <span>Cancha 2</span>
      </div>
      <div className='help-mini live'>
        <span className='help-mini-tag live'><i className='live-dot' />En vivo</span>
        <strong>6-4 · 3-2</strong>
        <span>Saca: tú</span>
      </div>
      <div className='help-mini'>
        <span className='help-mini-tag'>Historial</span>
        <strong>4V · 2D</strong>
        <span>67% victorias</span>
      </div>
    </div>
  )
}

export function ArtScore() {
  return (
    <div className='help-art' aria-hidden='true'>
      <div className='help-score'>
        <div className='help-score-row'>
          <i className='help-serve on' />
          <span className='help-score-name'>Tú</span>
          <span className='help-set'>6</span>
          <span className='help-set'>3</span>
          <span className='help-set'>/</span>
          <strong className='help-point'>40</strong>
        </div>
        <div className='help-score-row dim'>
          <i className='help-serve' />
          <span className='help-score-name'>Rival</span>
          <span className='help-set'>4</span>
          <span className='help-set'>2</span>
          <span className='help-set'>/</span>
          <strong className='help-point'>30</strong>
        </div>
        <div className='help-break'>BREAK POINT</div>
      </div>
    </div>
  )
}

export function ArtCourt() {
  return (
    <div className='help-art' aria-hidden='true'>
      <svg className='help-court' viewBox='0 0 300 150'>
        <rect x='8' y='8' width='284' height='134' rx='10' className='help-court-bg' />
        <rect x='30' y='25' width='240' height='100' className='help-court-lines' />
        <line x1='150' y1='25' x2='150' y2='125' className='help-court-lines' />
        <line x1='30' y1='55' x2='270' y2='55' className='help-court-lines' />
        <line x1='30' y1='95' x2='270' y2='95' className='help-court-lines' />
        <line x1='150' y1='70' x2='150' y2='80' className='help-court-net' />
        <circle r='7' className='help-ball' />
      </svg>
      <p className='help-caption'>Cancha ilustrativa · se pausa sola fuera de pantalla</p>
    </div>
  )
}

export function ArtJudge() {
  return (
    <div className='help-art' aria-hidden='true'>
      <div className='help-console'>
        <div className='help-console-row'>
          <span className='help-ptap p1'>Punto · Tú</span>
          <span className='help-ptap p2'>Punto · Rival</span>
        </div>
        <div className='help-console-row small'>
          <span>Falta</span>
          <span>Let</span>
          <span>Deshacer</span>
        </div>
        <div className='help-sync'>Sin conexión · 3 acciones en cola → se envían solas</div>
      </div>
    </div>
  )
}

export function ArtCoin() {
  return (
    <div className='help-art help-center' aria-hidden='true'>
      <div className='help-coin'>
        <span>C</span>
      </div>
      <p className='help-caption'>Cara o sello · quien gana elige si saca o recibe</p>
    </div>
  )
}

export function ArtDirector() {
  return (
    <div className='help-art' aria-hidden='true'>
      <div className='help-dir'>
        <span className='help-dir-item'>Reasignar juez</span>
        <span className='help-dir-item'>Sustituir</span>
        <span className='help-dir-item warn'>Cancelar</span>
        <span className='help-dir-item ok'>Reactivar</span>
        <span className='help-dir-item'>Corregir sets + motivo</span>
      </div>
    </div>
  )
}
