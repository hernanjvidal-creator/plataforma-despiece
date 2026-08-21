'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Mapea el color lógico de la pieza a un color real para el render.
// Los nombres deben calzar con las opciones del formulario en Configurador.jsx.
const COLOR_MAP = {
  blanco: '#f2f1ec',
  gris_claro: '#c9c9c4',
  gris_grafito: '#3f3f3f',
  nogal: '#5b3a29',
  roble: '#b98a53',
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

export default function Visor3D({ piezas, accesorios, parametros }) {
  const contenedorRef = useRef(null);

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
    // paneles horizontales (piso/techo/traviesas/baldas) quedan parados y los laterales
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
        // Panel acostado (piso, techo, traviesa, balda): ancho->X, alto->profundidad (Z), espesor->Y
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

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(ancho, alto);
    contenedor.innerHTML = '';
    contenedor.style.position = 'relative';
    contenedor.appendChild(renderer.domElement);
    renderer.domElement.style.cursor = 'pointer';

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
    pista.textContent = 'Doble clic en una pieza para ver su nombre';
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

    function actualizarPosicionEtiquetas() {
      const w = contenedor.clientWidth;
      etiquetasActivas.forEach(({ div, mesh }) => {
        const proyeccion = mesh.position.clone().project(camera);
        const visible = proyeccion.z < 1;
        div.style.display = visible ? 'block' : 'none';
        if (!visible) return;
        div.style.left = `${(proyeccion.x * 0.5 + 0.5) * w}px`;
        div.style.top = `${(-proyeccion.y * 0.5 + 0.5) * alto - 10}px`;
      });
    }

    const mallas = [];
    piezasRender.forEach(({ pieza, dimX, dimY, dimZ, x, y, z }) => {
      const geometry = new THREE.BoxGeometry(dimX, dimY, dimZ);
      const material = new THREE.MeshStandardMaterial({ color: colorDePieza(pieza) });
      const cubo = new THREE.Mesh(geometry, material);
      cubo.position.set(x, y, z);
      cubo.userData.pieza = pieza;

      const bordes = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.15, transparent: true })
      );
      cubo.add(bordes);

      scene.add(cubo);
      mallas.push(cubo);
    });

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
    };
  }, [piezas, accesorios, parametros]);

  return <div ref={contenedorRef} style={{ width: '100%', height: 460, borderRadius: 8, overflow: 'hidden' }} />;
}
