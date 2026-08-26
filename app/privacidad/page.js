export const metadata = {
  title: 'Política de Privacidad — Despiece',
};

export default function Privacidad() {
  return (
    <main className="container" style={{ maxWidth: 760 }}>
      <h1>Política de Privacidad</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Última actualización: agosto de 2026</p>

      <p>
        Esta Política de Privacidad explica qué datos recolecta Despiece (el sitio armandolo.com,
        operado por <strong>[Razón social / nombre del titular pendiente]</strong>, en adelante
        "nosotros" o "la plataforma"), para qué los usamos y qué derechos tienes sobre ellos.
      </p>

      <h2>1. Qué datos recolectamos</h2>
      <ul>
        <li><strong>Cuenta:</strong> tu correo electrónico, para crear tu cuenta e iniciar sesión (a través de Supabase Auth).</li>
        <li><strong>Diseños guardados:</strong> las medidas y configuración de los muebles que guardas en "Mis muebles" (ancho, alto, profundidad, secciones, colores, etc.).</li>
        <li><strong>Datos de compra:</strong> el registro de tus pedidos (qué mueble, cuándo, si está pagado) para poder entregarte el despiece que compraste. No almacenamos los datos de tu tarjeta — el pago se procesa directamente por Lemon Squeezy (ver sección 3).</li>
        <li><strong>Foto del espacio (opcional):</strong> si subes una foto de referencia de dónde irá el mueble, se guarda de forma privada, asociada solo a tu cuenta.</li>
      </ul>

      <h2>2. Para qué usamos tus datos</h2>
      <ul>
        <li>Generar el plano 3D, el listado de piezas y el diagrama de corte de tus diseños.</li>
        <li>Guardar tus muebles para que puedas volver a verlos o editarlos.</li>
        <li>Procesar tus compras y entregarte el despiece que pagaste.</li>
        <li>Responder tus consultas de soporte cuando nos escribes.</li>
      </ul>
      <p>No vendemos ni arrendamos tus datos a terceros. No usamos tus datos para fines distintos a los descritos acá.</p>

      <h2>3. Con quién compartimos datos</h2>
      <ul>
        <li><strong>Supabase</strong> (base de datos y autenticación): almacena tu cuenta y tus diseños de forma segura.</li>
        <li><strong>Lemon Squeezy</strong> (procesador de pagos): procesa el pago de tus compras. Lemon Squeezy recibe tu correo y los datos de tu método de pago directamente — nosotros nunca vemos ni guardamos el número de tu tarjeta.</li>
      </ul>

      <h2>4. Cookies y almacenamiento local</h2>
      <p>
        Usamos únicamente el almacenamiento necesario para mantener tu sesión iniciada (cookies/local
        storage de autenticación). Por ahora no usamos cookies de publicidad ni de seguimiento (analytics).
        Si en el futuro incorporamos herramientas de analítica o de campañas publicitarias, actualizaremos
        esta política para reflejarlo.
      </p>

      <h2>5. Tus derechos</h2>
      <p>
        Puedes pedirnos en cualquier momento acceder a tus datos, corregirlos o eliminarlos (incluyendo el
        cierre completo de tu cuenta). Para ejercer estos derechos, escríbenos a{' '}
        <a href="mailto:contacto@armandolo.com">contacto@armandolo.com</a>.
      </p>

      <h2>6. Seguridad</h2>
      <p>
        Tus datos se almacenan con acceso restringido: cada usuario solo puede ver y modificar su propia
        información (mediante reglas de seguridad a nivel de base de datos). Las conexiones al sitio están
        cifradas (HTTPS).
      </p>

      <h2>7. Cambios a esta política</h2>
      <p>
        Podemos actualizar esta política ocasionalmente. Si hacemos cambios importantes, lo indicaremos en
        esta misma página con la fecha de la última actualización.
      </p>

      <h2>8. Contacto</h2>
      <p>
        Para cualquier consulta sobre esta política o tus datos, escríbenos a{' '}
        <a href="mailto:contacto@armandolo.com">contacto@armandolo.com</a>.
      </p>
    </main>
  );
}
