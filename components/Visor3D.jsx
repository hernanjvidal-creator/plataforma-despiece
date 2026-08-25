'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Mapea el color lógico de la pieza a un color real para el render.
// Los nombres deben calzar con las opciones del formulario en Configurador.jsx.
// Paleta inspirada en la línea de melaminas Masisa (nombres reales de su
// catálogo; los tonos son una aproximación visual, no una muestra oficial).
const COLOR_MAP = {
  blanco: '#f2f1ec',
  gris_claro: '#c9c9c4',
  gris_grafito: '#3f3f3f',
  nogal: '#5b3a29',
  roble: '#b98a53',
  gris_ceniza: '#c8c6c0',
  vison: '#8d7c6a',
  negro: '#1c1c1c',
  aluminio: '#b3b3ae',
  concreto_metropolitan: '#9b9b93',
  terracota_charyn: '#b5573c',
  azul_acero: '#45606e',
  verde_glaciar: '#93a99a',
  sahara: '#c8a874',
  olmo_alpino: '#d9c9ac',
  coigue: '#b98f5e',
  nogal_africano: '#4a3123',
  cerezo: '#8a4a3c',
  fresno_humo: '#a99f92',
};

// Colores por material para piezas/accesorios sin `color` lógico (cubiertas
// en piedra, lavaplatos/lavamanos).
const COLOR_MATERIAL_MAP = {
  cuarzo: '#e8e6e1',
  granito: '#4a4a48',
  marmol: '#eae7e0',
  acero_inoxidable: '#c7cdd1',
  ceramica: '#f5f5f0',
};

function colorDePieza(pieza) {
  if (pieza.color && COLOR_MAP[pieza.color]) return COLOR_MAP[pieza.color];
  if (pieza.material && COLOR_MATERIAL_MAP[pieza.material]) return COLOR_MATERIAL_MAP[pieza.material];
  if (pieza.color && COLOR_MATERIAL_MAP[pieza.color]) return COLOR_MATERIAL_MAP[pieza.color];
  return '#d8c9a3';
}

// Escala de mm a unidades de escena (mm * ESCALA)
const ESCALA = 0.005;

const Visor3D = forwardRef(function Visor3D({ piezas, accesorios, parametros }, ref) {
  const contenedorRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);

  useImperativeHandle(ref, () => ({
    // Devuelve un PNG en base64 (dataURL) del cuadro actual del visor, para
    // incrustarlo en el PDF de entrega. Requiere que el renderer se haya
    // creado con preserveDrawingBuffer: true (ver más abajo).
    capturarImagen() {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (!renderer || !scene || !camera) return null;
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    },
  }));

  useEffect(() => {
    const todasLasPiezas = [...(piezas || []), ...(accesorios || [])];
    if (!contenedorRef.current || !todasLasPiezas.length) return;
    const contenedor = contenedorRef.current;

    const ancho = contenedor.clientWidth;
    const alto = 460;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#eeece6');

    // Dibujar cada pieza como una caja en su posición real (convertida a unidades de escena).
    // IMPORTANTE: pieza.ancho/alto/espesor son medidas "de plancha" (largo x ancho x espesor
    // del tablero), no ejes X/Y/Z de la escena. El campo `rotacion` indica cómo esa plancha
    // está orientada en el espacio; hay que mapear cada caso al eje que corresponde o los
    // paneles horizontales (piso/techo/traviesas/repisas) quedan parados y los laterales
    // quedan de frente en vez de de canto — que es justo lo que se veía "desarmado".
    //
    // La cámara se centra según el bounding box real de las piezas (no según parametros.A/H/P,
    // que no todos los módulos tienen — ej. el esquinero usa anchoA/anchoB en vez de A).
    const piezasRender = [];
    const min = { x: Infinity, y: Infinity, z: Infinity };
    const max = { x: -Infinity, y: -Infinity, z: -Infinity };

    todasLasPiezas.forEach(pieza => {
      const anchoPz = pieza.ancho * ESCALA;
      const altoPz = pieza.alto * ESCALA;
      const espesor = (pieza.espesor || 15) * ESCALA;
      const { x: px, y: py, z: pz } = pieza.posicion;
      const rotacion = pieza.rotacion || 'vertical_frontal';

      let dimX, dimY, dimZ, x, y, z;

      if (rotacion === 'horizontal') {
        // Panel acostado (piso, techo, traviesa, repisa): ancho->X, alto->profundidad (Z), espesor->Y
        dimX = anchoPz; dimY = espesor; dimZ = altoPz;
        x = px * ESCALA + dimX / 2;
        y = py * ESCALA + dimY / 2;
        z = pz * ESCALA + dimZ / 2;
      } else if (rotacion === 'vertical_profundidad') {
        // Panel lateral (de canto, corre en profundidad): ancho->profundidad (Z), alto->Y, espesor->X
        dimX = espesor; dimY = altoPz; dimZ = anchoPz;
        x = px * ESCALA + dimX / 2;
        y = py * ESCALA + dimY / 2;
        z = pz * ESCALA + dimZ / 2;
      } else {
        // vertical_frontal (puertas, frentes, respaldo, zócalo): ancho->X, alto->Y, espesor->Z
        dimX = anchoPz; dimY = altoPz; dimZ = espesor;
        x = px * ESCALA + dimX / 2;
        y = py * ESCALA + dimY / 2;
        z = pz * ESCALA + dimZ / 2;
      }

      piezasRender.push({ pieza, dimX, dimY, dimZ, x, y, z });

      min.x = Math.min(min.x, x - dimX / 2); max.x = Math.max(max.x, x + dimX / 2);
      min.y = Math.min(min.y, y - dimY / 2); max.y = Math.max(max.y, y + dimY / 2);
      min.z = Math.min(min.z, z - dimZ / 2); max.z = Math.max(max.z, z + dimZ / 2);
    });

    const centroX = (min.x + max.x) / 2;
    const centroY = (min.y + max.y) / 2;
    const centroZ = (min.z + max.z) / 2;
    const extension = Math.max(max.x - min.x, max.y - min.y, max.z - min.z, 0.1);
    const distancia = extension * 1.6;

    const camera = new THREE.PerspectiveCamera(45, ancho / alto, 0.1, 100);
    camera.position.set(centroX + distancia, centroY + distancia * 0.7, centroZ + distancia);
    camera.lookAt(centroX, centroY, centroZ);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(ancho, alto);
    contenedor.innerHTML = '';
    contenedor.style.position = 'relative';
    contenedor.appendChild(renderer.domElement);
    renderer.domElement.style.cursor = 'pointer';

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(centroX, centroY, centroZ);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.6);
    luzDireccional.position.set(5, 8, 5);
    scene.add(luzDireccional);

    // ---------- Overlay HTML para etiquetas + botón "Limpiar etiquetas" ----------
    // Doble clic en una pieza: le agrega (o le quita, si ya la tenía) una
    // etiqueta con su nombre y medidas — así se puede ir identificando cada
    // pieza del despiece directamente sobre el plano armado, pieza por pieza.
    const capaEtiquetas = document.createElement('div');
    Object.assign(capaEtiquetas.style, {
      position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden',
    });
    contenedor.appendChild(capaEtiquetas);

    const pista = document.createElement('div');
    pista.textContent = 'Doble clic: nombre de la pieza, o abre/cierra puertas y cajones';
    Object.assign(pista.style, {
      position: 'absolute', top: '8px', left: '8px', pointerEvents: 'none',
      fontSize: '12px', color: '#666', background: 'rgba(255,255,255,0.85)',
      padding: '3px 8px', borderRadius: '5px',
    });
    capaEtiquetas.appendChild(pista);

    const botonLimpiar = document.createElement('button');
    botonLimpiar.textContent = 'Limpiar etiquetas';
    Object.assign(botonLimpiar.style, {
      position: 'absolute', top: '8px', right: '8px', pointerEvents: 'auto',
      width: 'auto', marginTop: '0',
      fontSize: '12px', padding: '4px 10px', border: 'none', borderRadius: '5px',
      background: '#fff', color: '#a8552f', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    });
    botonLimpiar.onclick = () => limpiarEtiquetas();
    capaEtiquetas.appendChild(botonLimpiar);

    const etiquetasActivas = new Map(); // mesh -> { div, mesh }
    const COLOR_ETIQUETADA = new THREE.Color(0xa8552f);

    function crearEtiqueta(pieza) {
      const div = document.createElement('div');
      const medidas = `${Math.round(pieza.ancho)}×${Math.round(pieza.alto)}×${Math.round(pieza.espesor || 15)}mm`;
      div.innerHTML = `<strong>${pieza.id}</strong><br>${medidas}`;
      Object.assign(div.style, {
        position: 'absolute', transform: 'translate(-50%, -100%)',
        background: 'rgba(168,85,47,0.94)', color: '#fff',
        padding: '3px 8px', borderRadius: '5px', fontSize: '11px',
        lineHeight: '1.3', whiteSpace: 'nowrap', pointerEvents: 'none',
      });
      capaEtiquetas.appendChild(div);
      return div;
    }

    function quitarEtiqueta(mesh) {
      const entrada = etiquetasActivas.get(mesh);
      if (!entrada) return;
      entrada.div.remove();
      etiquetasActivas.delete(mesh);
      mesh.material.emissive.set(0x000000);
    }

    function limpiarEtiquetas() {
      [...etiquetasActivas.keys()].forEach(quitarEtiqueta);
    }

    const vectorMundial = new THREE.Vector3();
    function actualizarPosicionEtiquetas() {
      const w = contenedor.clientWidth;
      etiquetasActivas.forEach(({ div, mesh }) => {
        const proyeccion = mesh.getWorldPosition(vectorMundial).clone().project(camera);
        const visible = proyeccion.z < 1;
        div.style.display = visible ? 'block' : 'none';
        if (!visible) return;
        div.style.left = `${(proyeccion.x * 0.5 + 0.5) * w}px`;
        div.style.top = `${(-proyeccion.y * 0.5 + 0.5) * alto - 10}px`;
      });
    }

    // ---------- Manillas (solo decorativas, no seleccionables) ----------
    // Toda puerta lleva una manilla negra vertical; todo frente de cajón,
    // una manilla negra horizontal. Se agregan como hijos del cubo de la
    // pieza para heredar su posición/rotación sin recalcular transformadas.
    const manillaMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.35 });
    const REGEX_PUERTA = /puerta/;
    const REGEX_CAJON_FRENTE = /frente_cajon/;

    // La manilla va en el lado contrario a la bisagra (la puerta se abre
    // tirando desde el lado opuesto a donde gira). Mismo cálculo lo usa
    // luego la apertura interactiva para saber de qué lado poner el eje.
    function manillaVaALaDerecha(id) {
      const match = id.match(/(\d+)$/);
      const indice = match ? parseInt(match[1], 10) : 1;
      return indice % 2 === 1; // alterna lado según el número de puerta
    }

    // En un mueble sin esquinas, el "ancho" de un frente siempre corre en
    // X y su cara mira hacia +Z (por eso el código original de manillas y
    // apertura interactiva asumía justo eso). Un brazo rotado 90° en una
    // esquina (ver "transformarPiezaHeading" en muebleBajoCocina.js)
    // cambia esto: el ancho puede pasar a correr en Z, y la cara puede
    // mirar hacia +X o -X en vez de +Z. `ejesDePieza` determina cuál eje
    // de render es cuál para una pieza dada, y `signoHaciaAfuera` calcula
    // hacia dónde es "afuera" comparando contra el respaldo del mismo
    // brazo (que siempre queda del lado de adentro) en vez de asumir +Z.
    function ejesDePieza(pieza) {
      return pieza.rotacion === 'vertical_profundidad'
        ? { ejeAncho: 'z', ejeEspesor: 'x' }
        : { ejeAncho: 'x', ejeEspesor: 'z' };
    }

    const mapaRespaldos = new Map();
    piezas.forEach(pz => {
      const m = pz.id.match(/^(brazo\d+_)?respaldo$/);
      if (m) mapaRespaldos.set(m[1] || '', pz);
    });

    function signoHaciaAfuera(pieza, ejeEspesor) {
      const prefijo = (pieza.id.match(/^(brazo\d+_)/) || [null, ''])[1];
      const respaldo = mapaRespaldos.get(prefijo);
      if (!respaldo) return 1;
      return pieza.posicion[ejeEspesor] >= respaldo.posicion[ejeEspesor] ? 1 : -1;
    }

    function agregarManillaPuerta(cubo, dimAncho, dimAlto, dimEspesor, ejeAncho, dOut, id) {
      const largo = Math.min(120 * ESCALA, dimAlto * 0.5);
      const grosor = 10 * ESCALA;
      const separacion = 5 * ESCALA;
      const inset = Math.min(60 * ESCALA, dimAncho * 0.3);
      const haciaLaDerecha = manillaVaALaDerecha(id);
      const offsetAncho = haciaLaDerecha ? (dimAncho / 2 - inset) : -(dimAncho / 2 - inset);
      const offsetEspesor = dOut * (dimEspesor / 2 + grosor / 2 + separacion);
      const barra = new THREE.Mesh(new THREE.BoxGeometry(grosor, largo, grosor), manillaMaterial);
      if (ejeAncho === 'x') barra.position.set(offsetAncho, 0, offsetEspesor);
      else barra.position.set(offsetEspesor, 0, offsetAncho);
      cubo.add(barra);
    }

    function agregarManillaCajon(cubo, dimAncho, dimAlto, dimEspesor, ejeAncho, dOut) {
      const largo = Math.min(96 * ESCALA, dimAncho * 0.4);
      const grosor = 10 * ESCALA;
      const separacion = 5 * ESCALA;
      const y = dimAlto / 2 - Math.min(35 * ESCALA, dimAlto * 0.3);
      const offsetEspesor = dOut * (dimEspesor / 2 + grosor / 2 + separacion);
      const barra = new THREE.Mesh(new THREE.BoxGeometry(largo, grosor, grosor), manillaMaterial);
      if (ejeAncho === 'x') barra.position.set(0, y, offsetEspesor);
      else barra.position.set(offsetEspesor, y, 0);
      cubo.add(barra);
    }

    // ---------- Apertura interactiva de puertas y cajones ----------
    // Doble clic en una puerta la abre girándola sobre su bisagra (el lado
    // contrario a la manilla); doble clic en un cajón lo desliza hacia
    // afuera. Así se puede revisar cómo queda el interior armado — útil de
    // referencia al momento de armar en terreno.
    const ANGULO_APERTURA_PUERTA = (100 * Math.PI) / 180;
    const DESPLAZAMIENTO_APERTURA_CAJON = 320 * ESCALA;
    const piezasInteractivas = new Map(); // mesh -> { tipo, ...datos, abierto }

    function alternarApertura(mesh) {
      const datos = piezasInteractivas.get(mesh);
      if (!datos) return;
      datos.abierto = !datos.abierto;
      if (datos.tipo === 'puerta') {
        datos.pivot.rotation.y = datos.abierto ? datos.anguloAbierto : 0;
      } else {
        // 'cajon': todas las piezas del grupo (frente + caja) se mueven
        // juntas, como una sola unidad — no solo el frente.
        datos.piezas.forEach(({ mesh: m, cerradoValor }) => {
          m.position[datos.eje] = datos.abierto ? cerradoValor + datos.delta : cerradoValor;
        });
      }
    }

    const mallas = [];
    // El frente de un cajón y su caja interior (costados, trasera, fondo)
    // comparten `pieza.grupo` (ver piezasCajasSeccion en cada módulo) — se
    // recolectan acá para que, al abrir/cerrar, se muevan todos juntos
    // como una sola unidad en vez de que solo se desplace el frente.
    const gruposCajon = new Map(); // grupoId -> [mesh, mesh, ...]
    const frentesCajon = new Map(); // grupoId -> { mesh, ejeEspesor, dOut }

    piezasRender.forEach(({ pieza, dimX, dimY, dimZ, x, y, z }) => {
      const geometry = new THREE.BoxGeometry(dimX, dimY, dimZ);
      const material = new THREE.MeshStandardMaterial({ color: colorDePieza(pieza) });
      const cubo = new THREE.Mesh(geometry, material);
      cubo.userData.pieza = pieza;

      const bordes = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.15, transparent: true })
      );
      cubo.add(bordes);

      const { ejeAncho, ejeEspesor } = ejesDePieza(pieza);
      const dimAncho = ejeAncho === 'x' ? dimX : dimZ;
      const dimEspesor = ejeEspesor === 'x' ? dimX : dimZ;

      if (REGEX_PUERTA.test(pieza.id)) {
        const dOut = signoHaciaAfuera(pieza, ejeEspesor);
        agregarManillaPuerta(cubo, dimAncho, dimY, dimEspesor, ejeAncho, dOut, pieza.id);

        // La bisagra va del lado contrario a la manilla. Se arma un pivote
        // en esa arista y la puerta cuelga de él desplazada — así girar el
        // pivote gira la puerta sobre su bisagra en vez de sobre su centro.
        const bisagraIzquierda = manillaVaALaDerecha(pieza.id);
        const hingeLocal = bisagraIzquierda ? -dimAncho / 2 : dimAncho / 2;
        const pivotPos = { x, y, z };
        pivotPos[ejeAncho] += hingeLocal;
        const pivot = new THREE.Group();
        pivot.position.set(pivotPos.x, pivotPos.y, pivotPos.z);
        const cuboPos = { x: 0, y: 0, z: 0 };
        cuboPos[ejeAncho] = -hingeLocal;
        cubo.position.set(cuboPos.x, cuboPos.y, cuboPos.z);
        pivot.add(cubo);
        scene.add(pivot);

        // Ángulo con signo tal que el canto libre siempre gire hacia afuera
        // (dOut), sin importar de qué lado quedó la bisagra ni si el ancho
        // de este frente corre en X o en Z (brazo recto vs. rotado 90°).
        const factorEje = ejeAncho === 'x' ? 1 : -1;
        const anguloAbierto = dOut * Math.sign(hingeLocal) * factorEje * ANGULO_APERTURA_PUERTA;
        piezasInteractivas.set(cubo, { tipo: 'puerta', pivot, anguloAbierto, abierto: false });
      } else {
        cubo.position.set(x, y, z);
        if (REGEX_CAJON_FRENTE.test(pieza.id)) {
          const dOut = signoHaciaAfuera(pieza, ejeEspesor);
          agregarManillaCajon(cubo, dimAncho, dimY, dimEspesor, ejeAncho, dOut);
          frentesCajon.set(pieza.grupo || pieza.id, { mesh: cubo, ejeEspesor, dOut });
        }
        scene.add(cubo);
      }

      if (pieza.grupo) {
        if (!gruposCajon.has(pieza.grupo)) gruposCajon.set(pieza.grupo, []);
        gruposCajon.get(pieza.grupo).push(cubo);
      }

      mallas.push(cubo);
    });

    // Registrar la apertura interactiva UNA VEZ por grupo (no por pieza):
    // la dirección/eje la define siempre el frente (la única cara real
    // "hacia afuera"), y se aplica igual a todas las piezas del grupo —
    // así se abren juntas como si fueran un solo cajón, no solo la tapa.
    frentesCajon.forEach(({ mesh: meshFrente, ejeEspesor, dOut }, grupoId) => {
      const miembros = gruposCajon.get(grupoId) || [meshFrente];
      const datosCompartidos = {
        tipo: 'cajon',
        eje: ejeEspesor,
        delta: dOut * DESPLAZAMIENTO_APERTURA_CAJON,
        piezas: miembros.map(m => ({ mesh: m, cerradoValor: m.position[ejeEspesor] })),
        abierto: false,
      };
      miembros.forEach(m => piezasInteractivas.set(m, datosCompartidos));
    });

    const botonAbrirTodo = document.createElement('button');
    botonAbrirTodo.textContent = 'Abrir puertas y cajones';
    Object.assign(botonAbrirTodo.style, {
      position: 'absolute', top: '40px', right: '8px', pointerEvents: 'auto',
      width: 'auto', marginTop: '0',
      fontSize: '12px', padding: '4px 10px', border: 'none', borderRadius: '5px',
      background: '#fff', color: '#a8552f', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    });
    let todoAbierto = false;
    botonAbrirTodo.onclick = () => {
      todoAbierto = !todoAbierto;
      piezasInteractivas.forEach((datos, mesh) => {
        if (datos.abierto !== todoAbierto) alternarApertura(mesh);
      });
      botonAbrirTodo.textContent = todoAbierto ? 'Cerrar puertas y cajones' : 'Abrir puertas y cajones';
    };
    capaEtiquetas.appendChild(botonAbrirTodo);

    const raycaster = new THREE.Raycaster();
    function alDobleClick(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const intersecciones = raycaster.intersectObjects(mallas, false);
      if (intersecciones.length === 0) return;

      const mesh = intersecciones[0].object;
      if (piezasInteractivas.has(mesh)) {
        alternarApertura(mesh);
        return;
      }
      if (etiquetasActivas.has(mesh)) {
        quitarEtiqueta(mesh);
      } else {
        const div = crearEtiqueta(mesh.userData.pieza);
        etiquetasActivas.set(mesh, { div, mesh });
        mesh.material.emissive.set(COLOR_ETIQUETADA);
        mesh.material.emissiveIntensity = 0.5;
      }
    }
    renderer.domElement.addEventListener('dblclick', alDobleClick);

    let activo = true;
    function animar() {
      if (!activo) return;
      controls.update();
      actualizarPosicionEtiquetas();
      renderer.render(scene, camera);
      requestAnimationFrame(animar);
    }
    animar();

    function alRedimensionar() {
      const w = contenedor.clientWidth;
      camera.aspect = w / alto;
      camera.updateProjectionMatrix();
      renderer.setSize(w, alto);
    }
    window.addEventListener('resize', alRedimensionar);

    return () => {
      activo = false;
      window.removeEventListener('resize', alRedimensionar);
      renderer.domElement.removeEventListener('dblclick', alDobleClick);
      renderer.dispose();
      contenedor.innerHTML = '';
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [piezas, accesorios, parametros]);

  return <div ref={contenedorRef} style={{ width: '100%', height: 460, borderRadius: 8, overflow: 'hidden' }} />;
});

export default Visor3D;
