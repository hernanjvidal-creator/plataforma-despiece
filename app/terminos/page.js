export const metadata = {
  title: 'Términos y Condiciones — Despiece',
};

export default function Terminos() {
  return (
    <main className="container" style={{ maxWidth: 760 }}>
      <h1>Términos y Condiciones</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Última actualización: agosto de 2026</p>

      <p>
        Al usar Despiece (armandolo.com), operado por{' '}
        <strong>[Razón social / nombre del titular pendiente]</strong>, aceptas estos Términos y
        Condiciones. Léelos con atención antes de comprar.
      </p>

      <h2>1. Qué es Despiece</h2>
      <p>
        Despiece es una herramienta en línea que, a partir de las medidas y preferencias que tú ingresas,
        genera automáticamente un plano 3D referencial, un listado de piezas y herrajes, y un diagrama de
        corte optimizado para fabricar un mueble en melamina. No fabricamos ni instalamos muebles — el
        resultado es información para que tú (o el mueblista/maderera de tu elección) corte y arme el
        mueble.
      </p>

      <h2>2. Cuentas de usuario</h2>
      <p>
        Para guardar diseños y comprar necesitas crear una cuenta con tu correo electrónico. Eres
        responsable de mantener la confidencialidad de tu acceso y de toda actividad que ocurra en tu
        cuenta.
      </p>

      <h2>3. Precio y pago</h2>
      <p>
        El precio de cada despiece se muestra antes de pagar. El pago se procesa a través de Lemon Squeezy,
        un proveedor externo de pagos. Al completar el pago, el despiece detallado (listado de piezas,
        herrajes, diagrama de corte y PDF de entrega) queda disponible de inmediato en tu cuenta, en
        "Mis muebles".
      </p>

      <h2>4. Un diseño comprado no se puede modificar</h2>
      <p>
        Una vez comprado el despiece de un mueble, ese diseño queda guardado de solo lectura: no se puede
        editar ni volver a generar un plano distinto sobre la misma compra. Si quieres un mueble con otras
        medidas o configuración, debes crear un diseño nuevo (y una compra nueva).
      </p>

      <h2>5. Exactitud de las medidas y responsabilidad</h2>
      <p>
        El plano, el listado de piezas y el diagrama de corte se generan automáticamente en base a los
        datos que tú ingresas. Es tu responsabilidad verificar que las medidas ingresadas correspondan al
        espacio real donde irá el mueble. No nos hacemos responsables por errores de medición del cliente,
        ni por diferencias de corte propias de la máquina/proveedor que uses para cortar las piezas
        (tolerancias de corte, kerf de sierra, etc. — el sistema ya considera un descuento estándar, pero
        puede variar según el proveedor).
      </p>
      <p>
        El plano 3D es una representación referencial para visualizar el mueble — los colores, texturas y
        proporciones exactas pueden variar levemente respecto al resultado final físico.
      </p>

      <h2>6. Reembolsos y cancelaciones</h2>
      <p>
        Consulta el detalle en nuestra <a href="/reembolsos">Política de Reembolso</a>.
      </p>

      <h2>7. Uso permitido</h2>
      <p>
        Puedes usar los despieces que compras para tu propio proyecto (uso personal) o para fabricar y
        vender el mueble resultante. No está permitido revender, redistribuir o publicar el archivo/PDF del
        despiece como si fuera un producto propio de terceros.
      </p>

      <h2>8. Disponibilidad del servicio</h2>
      <p>
        Hacemos lo posible por mantener la plataforma disponible, pero no garantizamos un funcionamiento
        ininterrumpido. Si una falla técnica te impide acceder a un despiece ya pagado, contáctanos para
        resolverlo.
      </p>

      <h2>9. Modificaciones</h2>
      <p>
        Podemos actualizar estos Términos ocasionalmente. Los cambios importantes se indicarán en esta
        página con la fecha de actualización.
      </p>

      <h2>10. Ley aplicable</h2>
      <p>Estos Términos se rigen por las leyes de Chile.</p>

      <h2>11. Contacto</h2>
      <p>
        Para cualquier consulta, escríbenos a <a href="mailto:contacto@armandolo.com">contacto@armandolo.com</a>.
      </p>
    </main>
  );
}
