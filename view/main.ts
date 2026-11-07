// The View: runs inside the host's sandboxed iframe, receives the tool result and renders the part.
import { App } from "@modelcontextprotocol/ext-apps";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type PartResult = { name: string; triangles: number; size: [number, number, number]; format: string; stlBase64: string };

const stage = document.getElementById("stage")!;
const status = document.getElementById("status")!;
const nameEl = document.getElementById("name")!;
const metaEl = document.getElementById("meta")!;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1e6);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.2));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(1, 2, 3);
scene.add(key);

function resize() {
  const { clientWidth: w, clientHeight: h } = stage;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

(function loop() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
})();

let current: THREE.Mesh | null = null;

function show(part: PartResult) {
  const bytes = Uint8Array.from(atob(part.stlBase64), (c) => c.charCodeAt(0));
  const geometry = new STLLoader().parse(bytes.buffer);
  geometry.computeVertexNormals();
  geometry.center();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x9aa4ad, metalness: 0.25, roughness: 0.55 }));
  if (current) scene.remove(current);
  current = mesh;
  scene.add(mesh);

  geometry.computeBoundingSphere();
  const r = geometry.boundingSphere?.radius ?? 1;
  camera.position.set(r * 1.6, r * 1.2, r * 1.9);
  camera.near = r / 100;
  camera.far = r * 100;
  camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);

  nameEl.textContent = part.name;
  metaEl.textContent = `${part.triangles.toLocaleString()} tris · ${part.size.map((v) => v.toFixed(1)).join(" × ")}`;
  status.remove();
  resize();
}

const app = new App({ name: "CAD part viewer", version: "0.1.0" }, {});
app.ontoolresult = (result) => {
  const part = (result as { structuredContent?: PartResult }).structuredContent;
  if (part?.stlBase64) show(part);
  else status.textContent = "The tool didn't return a part.";
};
await app.connect();
