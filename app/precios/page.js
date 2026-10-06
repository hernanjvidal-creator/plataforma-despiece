export const metadata = {
  title: 'Precios — Armandolo',
};

const PRECIOS = [
  {
    grupo: 'Mueble cocina / Mueble aéreo',
    valor: 'US$3 por módulo',
    detalle: 'Se cobra por cada módulo del mueble (cocina bajo mesón o aéreo) — un mueble de 3 módulos son US$9.',
  },
  {
    grupo: 'Closet / Despensa',
    valor: 'US$7',
    detalle: 'Precio fijo por mueble, sin importar la cantidad de secciones o cajones.',
  },
  {
    grupo: 'Vanitorio, Velador, Escritorio, Librero, Baúl',
    valor: 'US$5',
    detalle: 'Precio fijo por mueble.',
  },
];

export default function Precios() {
  return (
    <main className="container" style={{ maxWidth: 760 }}>
      <h1>Precios</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Última actualización: septiembre de 2026</p>

      <p>
        Diseñar tu mueble, ver el plano 3D y previsualizar el despiece es siempre gratis, cuantas veces
        quieras. Solo se cobra al desbloquear el <strong>despiece detallado</strong> de un mueble: el
        listado completo de piezas y herrajes, el diagrama de corte optimizado por plancha, y el PDF de
        entrega listo para llevar a la maderera o ferretería.
      </p>

      <p style={{ color: 'var(--color-text-muted)', fontSize: 13, background: 'var(--color-accent-soft)', padding: 12, borderRadius: 8 }}>
        Los muebles que ya habías guardado en tu cuenta durante la etapa de prueba gratuita quedan libres de cobro
        para siempre. El costo que se detalla abajo aplica a los muebles nuevos.
      </p>

      <h2>Precio por tipo de mueble</h2>
      <table>
        <thead>
          <tr><th>Mueble</th><th>Precio</th></tr>
        </thead>
        <tbody>
          {PRECIOS.map(p => (
            <tr key={p.grupo}>
              <td>
                {p.grupo}
                <br />
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{p.detalle}</span>
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>{p.valor}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
        Precios en dólares estadounidenses (US$), <strong>más los impuestos que apliquen según tu país</strong> (por
        ejemplo IVA), que se calculan y muestran en el checkout antes de pagar.
      </p>

      <h2>Qué incluye el despiece detallado</h2>
      <ul>
        <li>Plano 3D del mueble ya armado, con las medidas reales de cada pieza.</li>
        <li>Listado de piezas y herrajes, con medidas, colores y cantos — listo para llevar a la maderera.</li>
        <li>Diagrama de corte optimizado por plancha de melamina.</li>
        <li>PDF de entrega y manual de armado del mueble.</li>
      </ul>

      <p>
        Puedes armar más de un mueble en una sola compra — cada uno se cobra por separado según la tabla
        de arriba. Puedes ver el detalle de lo que se está cobrando en el checkout, antes de pagar.
      </p>

      <h2>Medios de pago y reembolsos</h2>
      <p>
        El pago se procesa a través de una pasarela externa (tarjeta de crédito o débito). Para condiciones
        de devolución, revisa nuestra garantía de 5 días en la{' '}
        <a href="/reembolsos" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Política de Reembolso</a>.
      </p>

      <h2>Contacto</h2>
      <p>
        ¿Dudas sobre precios o una cotización para varios muebles? Escríbenos a{' '}
        <a href="mailto:contacto@armandolo.com">contacto@armandolo.com</a>.
      </p>
    </main>
  );
}
