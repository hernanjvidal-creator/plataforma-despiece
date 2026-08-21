'use client';

import { useState } from 'react';
import Visor3D from './Visor3D';
import ListaPiezas from './ListaPiezas';
import DiagramaCorte from './DiagramaCorte';

const PLANCHAS = [
  { value: 'CL', label: 'Chile — 1830x2500' },
  { value: 'CL_grande', label: 'Chile — 1830x3660 (formato grande)' },
  { value: 'AR', label: 'Argentina — 1830x2750' },
  { value: 'MX', label: 'México — 1220x2440' },
  { value: 'US', label: 'EEUU — 1220x2440' },
  { value: 'custom', label: 'Medida personalizada...' },
];

const MODULOS = [
  { value: 'bajo_cocina', label: 'Mueble bajo de cocina' },
  { value: 'alto_cocina', label: 'Mueble alto de cocina (alacena)' },
  { value: 'vanitorio_bano', label: 'Vanitorio de baño' },
  { value: 'closet', label: 'Closet / armario ropero' },
  { value: 'esquinero_bajo_cocina', label: 'Esquinero bajo de cocina (ciego)' },
];

const VALORES_POR_MODULO = {
  bajo_cocina: {
    A: 600, H: 700, P: 560,
    isla: false,
    cubiertaIncluir: false, cubiertaMaterial: 'melamina', cubiertaEspesor: 20,
    secciones: [
      { tipo: 'estandar', config: 'solo_cajones', nP: 0, nC: 3 },
    ],
    colorInterior: 'blanco', colorExterior: 'gris_grafito',
  },
  alto_cocina: {
    A: 600, H: 700, P: 320,
    nP: 2, nBaldas: 1,
    colorInterior: 'blanco', colorExterior: 'gris_grafito',
  },
  vanitorio_bano: {
    A: 600, H: 550, P: 450,
    nP: 0, nC: 2, repisas: 0, config: 'solo_cajones',
    soporte: 'patas', sifon: true,
    cubiertaIncluir: false, cubiertaMaterial: 'melamina', cubiertaEspesor: 20,
    colorInterior: 'blanco', colorExterior: 'gris_grafito',
  },
  closet: {
    A: 2400, H: 2200, P: 580,
    nP: 0, tipoPuerta: 'batiente',
    secciones: [
      { cajones: 2, repisas: 2, colgador: false },
      { cajones: 0, repisas: 1, colgador: true },
      { cajones: 2, repisas: 2, colgador: false },
    ],
    colorInterior: 'blanco', colorExterior: 'blanco',
  },
  esquinero_bajo_cocina: {
    H: 700, P: 560,
    anchoA: 900, anchoB: 900, zonaCiega: 300,
    colorInterior: 'blanco', colorExterior: 'gris_grafito',
  },
};

const VALORES_INICIALES = {
  modulo: 'bajo_cocina',
  ...VALORES_POR_MODULO.bajo_cocina,
  plancha: 'CL', anchoCustom: 1830, altoCustom: 2500,
};

export default function Configurador() {
  const [form, setForm] = useState(VALORES_INICIALES);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  function actualizar(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
  }

  function cambiarModulo(modulo) {
    setForm(f => ({
      ...f,
      modulo,
      ...VALORES_POR_MODULO[modulo],
    }));
    setResultado(null);
  }

  // La config "solo_puertas"/"solo_cajones" solo admite un tipo de frente, pero el
  // campo oculto (nC o nP) puede conservar un valor viejo de una config anterior.
  // Se fuerza a 0 el que no corresponde para que siempre calcen con `config`.
  function nPyNCporConfig(config, nP, nC) {
    if (config === 'solo_puertas') return { nP, nC: 0 };
    if (config === 'solo_cajones') return { nP: 0, nC };
    return { nP, nC }; // mixto
  }

  // ---------- Secciones (closet: columnas; bajo_cocina: módulos de cocina) ----------
  function agregarSeccion() {
    const nueva = form.modulo === 'closet'
      ? { cajones: 0, repisas: 1, colgador: false }
      : { tipo: 'estandar', config: 'solo_cajones', nP: 0, nC: 2 };
    setForm(f => ({ ...f, secciones: [...f.secciones, nueva] }));
  }

  function quitarSeccion(indice) {
    setForm(f => ({
      ...f,
      secciones: f.secciones.filter((_, i) => i !== indice),
    }));
  }

  function actualizarSeccion(indice, campo, valor) {
    setForm(f => ({
      ...f,
      secciones: f.secciones.map((s, i) => i === indice ? { ...s, [campo]: valor } : s),
    }));
  }

  function construirParametros() {
    if (form.modulo === 'esquinero_bajo_cocina') {
      return {
        H: Number(form.H), P: Number(form.P),
        anchoA: Number(form.anchoA), anchoB: Number(form.anchoB), zonaCiega: Number(form.zonaCiega),
        colorInterior: form.colorInterior, colorExterior: form.colorExterior,
      };
    }

    const base = {
      A: Number(form.A), H: Number(form.H), P: Number(form.P),
      colorInterior: form.colorInterior, colorExterior: form.colorExterior,
    };

    const cubierta = {
      incluir: !!form.cubiertaIncluir,
      material: form.cubiertaMaterial,
      espesor: Number(form.cubiertaEspesor) || 20,
    };

    if (form.modulo === 'bajo_cocina') {
      return {
        ...base,
        isla: !!form.isla,
        cubierta,
        secciones: form.secciones.map(s => {
          const ancho = s.ancho ? Number(s.ancho) : undefined;
          if (s.tipo === 'estandar') {
            const { nP, nC } = nPyNCporConfig(s.config, Number(s.nP) || 0, Number(s.nC) || 0);
            const repisas = nP > 0 ? Number(s.repisas) || 0 : 0;
            return { tipo: 'estandar', config: s.config, nP, nC, repisas, ancho };
          }
          if (s.tipo === 'cajones_olleros' || s.tipo === 'cajones_cubiertos') {
            return { tipo: s.tipo, nC: s.nC ? Number(s.nC) : undefined, ancho };
          }
          return { tipo: s.tipo, ancho };
        }),
      };
    }
    if (form.modulo === 'alto_cocina') {
      return { ...base, nP: Number(form.nP), nBaldas: Number(form.nBaldas) };
    }
    if (form.modulo === 'closet') {
      return {
        ...base,
        nP: Number(form.nP), tipoPuerta: form.tipoPuerta,
        secciones: form.secciones.map(s => ({
          cajones: Number(s.cajones), repisas: Number(s.repisas), colgador: !!s.colgador,
        })),
      };
    }
    if (form.modulo === 'vanitorio_bano') {
      const { nP, nC } = nPyNCporConfig(form.config, Number(form.nP), Number(form.nC));
      const repisas = nP > 0 ? Number(form.repisas) || 0 : 0;
      return {
        ...base,
        nP, nC, repisas, config: form.config,
        soporte: form.soporte, sifon: !!form.sifon,
        cubierta,
      };
    }
    return base;
  }

  async function generar() {
    setCargando(true);
    setError(null);
    try {
      const parametros = construirParametros();
      const opcionesCorte = form.plancha === 'custom'
        ? { plancha: 'custom', anchoCustom: Number(form.anchoCustom), altoCustom: Number(form.altoCustom) }
        : { plancha: form.plancha };

      const res = await fetch('/api/despiece', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulo: form.modulo, parametros, opcionesCorte }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando el despiece');
      setResultado(data);
    } catch (e) {
      setError(e.message);
      setResultado(null);
    } finally {
      setCargando(false);
    }
  }

  const moduloLabel = MODULOS.find(m => m.value === form.modulo)?.label || '';

  return (
    <main className="container">
      <h1>Configurador — {moduloLabel}</h1>

      <div className="grid-2">
        {/* ---------- Panel de parámetros ---------- */}
        <div className="card">
          <label>Tipo de mueble</label>
          <select value={form.modulo} onChange={e => cambiarModulo(e.target.value)}>
            {MODULOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>

          {form.modulo === 'esquinero_bajo_cocina' ? (
            <>
              <label>Largo brazo A (mm, desde la esquina)</label>
              <input type="number" value={form.anchoA} onChange={e => actualizar('anchoA', e.target.value)} />

              <label>Largo brazo B (mm, desde la esquina)</label>
              <input type="number" value={form.anchoB} onChange={e => actualizar('anchoB', e.target.value)} />
            </>
          ) : (
            <>
              <label>Ancho (mm)</label>
              <input type="number" value={form.A} onChange={e => actualizar('A', e.target.value)} />
            </>
          )}

          <label>Alto (mm)</label>
          <input type="number" value={form.H} onChange={e => actualizar('H', e.target.value)} />

          <label>Profundidad (mm)</label>
          <input type="number" value={form.P} onChange={e => actualizar('P', e.target.value)} />

          {form.modulo === 'esquinero_bajo_cocina' && (
            <>
              <label>Zona ciega en brazo B (mm, sin puerta junto a la esquina)</label>
              <input type="number" min={0} value={form.zonaCiega} onChange={e => actualizar('zonaCiega', e.target.value)} />
            </>
          )}

          {form.modulo === 'alto_cocina' && (
            <>
              <label>Cantidad de puertas</label>
              <input type="number" min={1} value={form.nP} onChange={e => actualizar('nP', e.target.value)} />

              <label>Cantidad de baldas interiores</label>
              <input type="number" min={0} value={form.nBaldas} onChange={e => actualizar('nBaldas', e.target.value)} />
            </>
          )}

          {form.modulo === 'closet' && (
            <>
              <label>Secciones del interior (de izquierda a derecha)</label>
              {form.secciones.map((s, i) => (
                <div key={i} style={{ border: '1px solid #e4e2dc', borderRadius: 8, padding: 10, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13 }}>Sección {i + 1}</strong>
                    {form.secciones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitarSeccion(i)}
                        style={{ margin: 0, width: 'auto', padding: '2px 8px', fontSize: 12, background: 'var(--color-danger)' }}
                      >
                        Quitar
                      </button>
                    )}
                  </div>

                  <label>Cajones</label>
                  <input type="number" min={0} value={s.cajones} onChange={e => actualizarSeccion(i, 'cajones', e.target.value)} />

                  <label>Repisas</label>
                  <input type="number" min={0} value={s.repisas} onChange={e => actualizarSeccion(i, 'repisas', e.target.value)} />

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      style={{ width: 'auto' }}
                      checked={!!s.colgador}
                      onChange={e => actualizarSeccion(i, 'colgador', e.target.checked)}
                    />
                    Colgador (barra para colgar ropa)
                  </label>
                </div>
              ))}
              <button
                type="button"
                onClick={agregarSeccion}
                style={{ marginTop: 8, background: '#fff', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}
              >
                + Agregar sección
              </button>

              <label style={{ marginTop: 18 }}>Cantidad de puertas (0 = closet abierto)</label>
              <input type="number" min={0} value={form.nP} onChange={e => actualizar('nP', e.target.value)} />

              {Number(form.nP) > 0 && (
                <>
                  <label>Tipo de puerta</label>
                  <select value={form.tipoPuerta} onChange={e => actualizar('tipoPuerta', e.target.value)}>
                    <option value="batiente">Batiente (con bisagra)</option>
                    <option value="corredera">Corredera (sobre riel)</option>
                  </select>
                </>
              )}
            </>
          )}

          {form.modulo === 'bajo_cocina' && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={!!form.isla}
                  onChange={e => actualizar('isla', e.target.checked)}
                />
                Mueble isla (independiente, respaldo terminado)
              </label>

              <label>Secciones (de izquierda a derecha)</label>
              {form.secciones.map((s, i) => (
                <div key={i} style={{ border: '1px solid #e4e2dc', borderRadius: 8, padding: 10, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13 }}>Sección {i + 1}</strong>
                    {form.secciones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitarSeccion(i)}
                        style={{ margin: 0, width: 'auto', padding: '2px 8px', fontSize: 12, background: 'var(--color-danger)' }}
                      >
                        Quitar
                      </button>
                    )}
                  </div>

                  <label>Tipo</label>
                  <select value={s.tipo} onChange={e => actualizarSeccion(i, 'tipo', e.target.value)}>
                    <option value="estandar">Estándar (puertas/cajones)</option>
                    <option value="lavaplatos">Lavaplatos</option>
                    <option value="lavavajillas">Lavavajillas (600mm, sin frente)</option>
                    <option value="horno">Horno empotrado (600mm, sin frente)</option>
                    <option value="cajones_olleros">Cajones olleros (altos)</option>
                    <option value="cajones_cubiertos">Cajones cubiertos (bajos)</option>
                  </select>

                  {s.tipo === 'estandar' && (
                    <>
                      <label>Configuración</label>
                      <select value={s.config} onChange={e => actualizarSeccion(i, 'config', e.target.value)}>
                        <option value="solo_cajones">Solo cajones</option>
                        <option value="solo_puertas">Solo puertas</option>
                        <option value="mixto">Cajones abajo + puertas arriba</option>
                      </select>

                      {(s.config === 'solo_cajones' || s.config === 'mixto') && (
                        <>
                          <label>Cantidad de cajones</label>
                          <input type="number" min={1} value={s.nC} onChange={e => actualizarSeccion(i, 'nC', e.target.value)} />
                        </>
                      )}
                      {(s.config === 'solo_puertas' || s.config === 'mixto') && (
                        <>
                          <label>Cantidad de puertas</label>
                          <input type="number" min={1} value={s.nP} onChange={e => actualizarSeccion(i, 'nP', e.target.value)} />

                          <label>Repisas interiores (además del piso)</label>
                          <input type="number" min={0} value={s.repisas ?? 0} onChange={e => actualizarSeccion(i, 'repisas', e.target.value)} />
                        </>
                      )}
                    </>
                  )}

                  {(s.tipo === 'cajones_olleros' || s.tipo === 'cajones_cubiertos') && (
                    <>
                      <label>Cantidad de cajones</label>
                      <input
                        type="number" min={1}
                        value={s.nC ?? ''}
                        placeholder={s.tipo === 'cajones_olleros' ? '2' : '1'}
                        onChange={e => actualizarSeccion(i, 'nC', e.target.value)}
                      />
                    </>
                  )}

                  {(s.tipo === 'lavaplatos' || s.tipo === 'lavavajillas' || s.tipo === 'horno') && (
                    <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0' }}>
                      Ancho estándar 600mm{s.tipo === 'lavaplatos' ? ' (según cubeta simple/doble)' : ''}.
                      {(s.tipo === 'lavavajillas' || s.tipo === 'horno') && ' Sin frente propio: lo cubre el electrodoméstico.'}
                    </p>
                  )}

                  <label>Ancho fijo (mm, opcional — vacío = automático)</label>
                  <input
                    type="number" min={0}
                    value={s.ancho ?? ''}
                    onChange={e => actualizarSeccion(i, 'ancho', e.target.value === '' ? undefined : e.target.value)}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={agregarSeccion}
                style={{ marginTop: 8, background: '#fff', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}
              >
                + Agregar sección
              </button>
            </>
          )}

          {form.modulo === 'vanitorio_bano' && (
            <>
              <label>Configuración de frentes</label>
              <select value={form.config} onChange={e => actualizar('config', e.target.value)}>
                <option value="solo_cajones">Solo cajones</option>
                <option value="solo_puertas">Solo puertas</option>
                <option value="mixto">Cajón superior + puertas</option>
              </select>

              {(form.config === 'solo_cajones' || form.config === 'mixto') && (
                <>
                  <label>Cantidad de cajones</label>
                  <input type="number" min={1} value={form.nC} onChange={e => actualizar('nC', e.target.value)} />
                </>
              )}

              {(form.config === 'solo_puertas' || form.config === 'mixto') && (
                <>
                  <label>Cantidad de puertas</label>
                  <input type="number" min={1} value={form.nP} onChange={e => actualizar('nP', e.target.value)} />

                  <label>Repisas interiores (además del piso)</label>
                  <input type="number" min={0} value={form.repisas} onChange={e => actualizar('repisas', e.target.value)} />
                </>
              )}
            </>
          )}

          {form.modulo === 'vanitorio_bano' && (
            <>
              <label>Soporte</label>
              <select value={form.soporte} onChange={e => actualizar('soporte', e.target.value)}>
                <option value="patas">Con patas (apoyado en el piso)</option>
                <option value="suspendido">Suspendido (colgado de la pared)</option>
              </select>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={!!form.sifon}
                  onChange={e => actualizar('sifon', e.target.checked)}
                />
                Lleva lavamanos con sifón (deja nota de perforación)
              </label>
            </>
          )}

          {(form.modulo === 'bajo_cocina' || form.modulo === 'vanitorio_bano') && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={!!form.cubiertaIncluir}
                  onChange={e => actualizar('cubiertaIncluir', e.target.checked)}
                />
                Incluir cubierta (superficie)
                {form.modulo === 'bajo_cocina' ? ' + lavaplatos' : ' + lavamanos'}
              </label>

              {form.cubiertaIncluir && (
                <>
                  <label>Material de la cubierta</label>
                  <select value={form.cubiertaMaterial} onChange={e => actualizar('cubiertaMaterial', e.target.value)}>
                    <option value="melamina">Melamina (se corta y anida con el resto)</option>
                    <option value="cuarzo">Cuarzo (proveedor aparte, no se anida)</option>
                    <option value="granito">Granito (proveedor aparte, no se anida)</option>
                    <option value="marmol">Mármol (proveedor aparte, no se anida)</option>
                  </select>

                  <label>Espesor cubierta (mm)</label>
                  <input type="number" min={10} value={form.cubiertaEspesor} onChange={e => actualizar('cubiertaEspesor', e.target.value)} />
                </>
              )}
            </>
          )}

          <label>Color interior (cajones/bandejas/baldas)</label>
          <select value={form.colorInterior} onChange={e => actualizar('colorInterior', e.target.value)}>
            <option value="blanco">Blanco</option>
            <option value="gris_claro">Gris claro</option>
          </select>

          <label>Color exterior (frentes/puertas/zócalo)</label>
          <select value={form.colorExterior} onChange={e => actualizar('colorExterior', e.target.value)}>
            <option value="blanco">Blanco</option>
            <option value="gris_grafito">Gris grafito</option>
            <option value="nogal">Nogal</option>
            <option value="roble">Roble</option>
          </select>

          <label>Plancha de melamina</label>
          <select value={form.plancha} onChange={e => actualizar('plancha', e.target.value)}>
            {PLANCHAS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          {form.plancha === 'custom' && (
            <>
              <label>Ancho plancha (mm)</label>
              <input type="number" value={form.anchoCustom} onChange={e => actualizar('anchoCustom', e.target.value)} />
              <label>Alto plancha (mm)</label>
              <input type="number" value={form.altoCustom} onChange={e => actualizar('altoCustom', e.target.value)} />
            </>
          )}

          <button onClick={generar} disabled={cargando}>
            {cargando ? 'Generando...' : 'Generar despiece'}
          </button>

          {error && <p style={{ color: 'var(--color-danger)', marginTop: 10 }}>{error}</p>}
        </div>

        {/* ---------- Panel de resultados ---------- */}
        <div>
          {!resultado && (
            <div className="card" style={{ textAlign: 'center', color: '#888' }}>
              Completa los parámetros y genera el despiece para ver el plano 3D,
              el listado de piezas y el diagrama de corte.
            </div>
          )}

          {resultado && (
            <>
              <div className="card" style={{ marginBottom: 20 }}>
                <h3>Plano 3D</h3>
                <Visor3D
                  piezas={resultado.despiece.piezas}
                  accesorios={resultado.despiece.accesorios}
                  parametros={resultado.despiece.parametros}
                />
              </div>

              <div className="card" style={{ marginBottom: 20 }}>
                <h3>Listado de piezas y herrajes</h3>
                <ListaPiezas despiece={resultado.despiece} />
              </div>

              <div className="card">
                <h3>Diagrama de corte</h3>
                <DiagramaCorte corte={resultado.corte} />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
