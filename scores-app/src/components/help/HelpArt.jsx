import './HelpArt.css'
import ClayCourt from '../match/ClayCourt'

/* Ilustraciones animadas solo con CSS/SVG y variables del tema.
   Respetan prefers-reduced-motion (ver HelpArt.css). */

export function ArtLogin() {
  return (
    <div className='help-art' aria-hidden='true'>
      <div className='help-phone'>
        <p className='help-phone-title'>Bienvenido</p>
        <div className='help-field'>
          <span className='help-field-dot' />
          <span className='help-typing'>
            ana.garcia
            <span className='help-caret' />
          </span>
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
        <span className='help-mini-tag live'>
          <i className='live-dot' />
          En vivo
        </span>
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
        <div className='help-break'>EJEMPLO · PUNTO ACTUAL</div>
      </div>
    </div>
  )
}

export function ArtCourt() {
  return (
    <div className='help-art'>
      <ClayCourt match={{ estado: 'en_vivo', modalidad: 'dobles' }} />
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

export function ArtServe() {
  return (
    <div className='help-art' aria-hidden='true'>
      <div className='help-dir'>
        <span className='help-dir-item ok'>Servidor inicial: Tú</span>
        <span className='help-dir-item'>Cambiar saque al rival</span>
      </div>
      <p className='help-caption'>Viene definido en el partido · corrígelo solo si es necesario</p>
    </div>
  )
}

export function ArtFormat() {
  return (
    <div className='help-art' aria-hidden='true'>
      <div className='help-dir'>
        <span className='help-dir-item'>Mejor de 3 sets</span>
        <span className='help-dir-item'>Ventaja o punto decisivo</span>
        <span className='help-dir-item'>Tie-break a 7</span>
      </div>
      <p className='help-caption'>
        Ejemplos de reglas · consulta siempre el formato configurado de tu partido
      </p>
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
