export const metadata = {
  title: 'Política de Reembolso — Despiece',
};

export default function Reembolsos() {
  return (
    <main className="container" style={{ maxWidth: 760 }}>
      <h1>Política de Reembolso</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Última actualización: agosto de 2026</p>

      <h2>Por qué el despiece no tiene devolución una vez entregado</h2>
      <p>
        Cada despiece que compras se genera de forma automática y personalizada según las medidas y
        configuración exactas que tú ingresaste — no es un producto genérico de stock, sino un resultado
        hecho a la medida de tu proyecto. Por eso, una vez que el pago se confirma y el despiece detallado
        (listado de piezas, herrajes, diagrama de corte y PDF) queda disponible en tu cuenta, la compra no
        tiene derecho a devolución ni reembolso, salvo los casos descritos abajo.
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
        Nota: en Chile, la Ley del Consumidor (Ley 19.496) contempla un "derecho a retracto" para compras a
        distancia, pero este generalmente no aplica a bienes o servicios confeccionados según las
        especificaciones del consumidor o claramente personalizados — que es justamente el caso de un
        despiece calculado a medida.
      </p>

      <h2>Cuándo sí te devolvemos el pago</h2>
      <ul>
        <li>Si pagaste y, por un error técnico de la plataforma, nunca pudiste acceder al despiece.</li>
        <li>Si se te cobró más de una vez por el mismo mueble por un error del sistema.</li>
        <li>Si el despiece entregado contiene un error atribuible a un bug del cálculo (no a datos que tú ingresaste incorrectamente) que haga que las piezas no correspondan a la configuración que elegiste.</li>
      </ul>
      <p>
        En estos casos, escríbenos a <a href="mailto:contacto@armandolo.com">contacto@armandolo.com</a> con
        el nombre del mueble y, si puedes, una captura del problema. Vamos a revisarlo y, si corresponde, te
        devolvemos el pago a través de Lemon Squeezy o te generamos el despiece correcto sin costo
        adicional.
      </p>

      <h2>Errores de medición o de instalación</h2>
      <p>
        No cubrimos reembolsos por medidas mal ingresadas por el cliente, cambios de opinión sobre el
        diseño después de la compra, o diferencias que resulten del corte/armado en el taller o ferretería
        que elijas (eso está fuera de nuestro control). Por eso te recomendamos revisar bien las medidas y
        la configuración antes de pagar — puedes generar y previsualizar el plano 3D las veces que quieras
        de forma gratuita antes de comprar.
      </p>

      <h2>Contacto</h2>
      <p>
        Cualquier duda sobre esta política, escríbenos a{' '}
        <a href="mailto:contacto@armandolo.com">contacto@armandolo.com</a>.
      </p>
    </main>
  );
}
