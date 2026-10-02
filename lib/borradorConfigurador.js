// Borrador del diseño en el navegador: permite que un cliente sin cuenta cree
// una (o inicie sesión, incluso con Google) y vuelva a encontrar su mueble tal
// como lo dejó, en vez de un configurador en blanco.

const CLAVE = 'armandolo_borrador_v1';
const VIGENCIA_MS = 24 * 60 * 60 * 1000;

export const URL_RESTAURAR = '/configurador?restaurar=1';

export function guardarBorrador(form, intencion) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ form, intencion, ts: Date.now() }));
  } catch {}
}

export function leerBorrador() {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return null;
    const borrador = JSON.parse(raw);
    if (!borrador?.form || Date.now() - borrador.ts > VIGENCIA_MS) {
      localStorage.removeItem(CLAVE);
      return null;
    }
    return borrador;
  } catch {
    return null;
  }
}

export function borrarBorrador() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {}
}
