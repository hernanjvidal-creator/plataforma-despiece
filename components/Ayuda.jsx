'use client';

import { useState } from 'react';

// Signo "?" junto a una etiqueta: al pasar el cursor (o tocarlo en el celular,
// o enfocarlo con el teclado) despliega la nota explicativa.
export default function Ayuda({ children }) {
  const [abierta, setAbierta] = useState(false);

  return (
    <span
      className="ayuda"
      onMouseEnter={() => setAbierta(true)}
      onMouseLeave={() => setAbierta(false)}
    >
      <button
        type="button"
        className="ayuda-btn"
        aria-label="Más información"
        aria-expanded={abierta}
        onClick={e => { e.preventDefault(); e.stopPropagation(); setAbierta(a => !a); }}
        onFocus={() => setAbierta(true)}
        onBlur={() => setAbierta(false)}
      >
        ?
      </button>
      {abierta && <span role="tooltip" className="ayuda-globo">{children}</span>}
    </span>
  );
}
