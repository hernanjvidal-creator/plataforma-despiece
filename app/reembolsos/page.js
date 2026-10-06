export const metadata = {
  title: 'Política de Reembolso — Armandolo',
};

export default function Reembolsos() {
  return (
    <main className="container" style={{ maxWidth: 760 }}>
      <h1>Política de Reembolso</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Última actualización: octubre de 2026</p>

      <p>
        Esta Política de Reembolso aplica a las compras realizadas en Armandolo (armandolo.com), operado
        por <strong>Inversiones Chacay SpA, RUT 78.518.419-K</strong>.
      </p>

      <h2>Garantía de devolución de 5 días</h2>
      <p>
        Si compraste un despiece y <strong>no es lo que esperabas</strong>, tienes <strong>5 días corridos
        desde la fecha de la compra</strong> para pedir que te devolvamos tu dinero. Te devolvemos el
        <strong>100% de lo que pagaste</strong> (impuestos incluidos), sin necesidad de justificar el motivo.
      </p>
      <h3>Cómo pedirlo</h3>
      <ol>
        <li>
          Escríbenos a <a href="mailto:contacto@armandolo.com">contacto@armandolo.com</a> dentro de los 5 días,
          desde el correo con el que compraste, indicando el nombre del mueble.
        </li>
        <li>Gestionamos el reembolso a través de Lemon Squeezy, nuestro procesador de pagos.</li>
        <li>
          El dinero vuelve al mismo medio de pago con el que pagaste. Dependiendo de tu banco, puede tardar
          entre 5 y 10 días hábiles en verse reflejado.
        </li>
      </ol>
      <p>
        Cuando se reembolsa una compra, el despiece de ese mueble vuelve a quedar bloqueado en tu cuenta.
        Esta garantía es adicional y no afecta los derechos que la ley te reconozca como consumidor.
      </p>

      <h2>Después de los 5 días</h2>
      <p>Pasado ese plazo, igualmente te devolvemos el pago en estos casos:</p>
      <ul>
        <li>Si pagaste y, por un error técnico de la plataforma, nunca pudiste acceder al despiece.</li>
        <li>Si se te cobró más de una vez por el mismo mueble por un error del sistema.</li>
        <li>Si el despiece entregado contiene un error atribuible a un bug del cálculo (no a datos que tú ingresaste incorrectamente) que haga que las piezas no correspondan a la configuración que elegiste.</li>
      </ul>
      <p>
        En estos casos escríbenos a <a href="mailto:contacto@armandolo.com">contacto@armandolo.com</a> con el
        nombre del mueble y, si puedes, una captura del problema. Vamos a revisarlo y, si corresponde, te
        devolvemos el pago a través de Lemon Squeezy o te generamos el despiece correcto sin costo adicional.
      </p>

      <h2>Qué no cubre la garantía fuera de plazo</h2>
      <p>
        Pasados los 5 días no cubrimos reembolsos por medidas mal ingresadas por el cliente, cambios de opinión
        sobre el diseño, o diferencias que resulten del corte o armado en el taller o ferretería que elijas
        (eso está fuera de nuestro control). Por eso puedes generar y previsualizar el plano 3D las veces que
        quieras, gratis, antes de comprar.
      </p>

      <h2>Contacto</h2>
      <p>
        Cualquier duda sobre esta política, escríbenos a{' '}
        <a href="mailto:contacto@armandolo.com">contacto@armandolo.com</a>.
      </p>
    </main>
  );
}
