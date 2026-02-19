/**
 * Three.js research tree visualization (Path of Exile–style).
 * Orthographic 2.5D view: nodes as glowing orbs, edges as lines, pan and zoom.
 */
import * as THREE from 'three';
import type { ResearchNode } from '../../application/research.js';
import {
  SPRITE_URL,
  SPRITE_COLS,
  SPRITE_ROWS,
} from '../icons/spriteConfig.js';

const NODE_SPACING_X = 2.8;
const NODE_SPACING_Y = 2.8;
const NODE_RING_INNER = 0.44;
const NODE_RING_OUTER = 0.56;
const CAMERA_Z = 50;
const ORTHO_SIZE_BASE = 25;
/** Vertical extent smaller than horizontal so the tree fills more of the canvas height (less "side" view). */
const ORTHO_HEIGHT_FACTOR = 0.7;
const PATH_HIGHLIGHT_COLOR = 0x4ade80;
const EDGE_DEFAULT = 0x3d4a5c;
const EDGE_PATH = 0x6ee7b7;
/** Progress arc on ring (same as list/modal progress fill). */
const PROGRESS_ARC_COLOR = 0xf59e0b;
const NODE_RING_MID = (NODE_RING_INNER + NODE_RING_OUTER) / 2;

/** Per-node state for coloring. */
export type ResearchNodeState = {
  done: boolean;
  canAttempt: boolean;
};

export type ResearchTreeSceneInput = {
  rows: ResearchNode[][];
  segments: { fromRow: number; fromIdx: number; toRow: number; toIdx: number }[];
  stateById: Record<string, ResearchNodeState>;
  /** Resolver: nodeId -> sprite cell index (from researchIconMapping.json). Used for 3D node icons. */
  getSpriteIndexForNode?: (nodeId: string) => number;
};

export type ResearchProgressData = { endTimeMs: number; totalDurationMs: number };

export type ResearchTreeScene = {
  resize: (w: number, h: number) => void;
  dispose: () => void;
  domElement: HTMLCanvasElement;
  setState: (stateById: Record<string, ResearchNodeState>) => void;
  setHighlightPath: (nodeIds: string[] | null) => void;
  setProgress: (progressById: Record<string, ResearchProgressData | null>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  onNodePick: (callback: (nodeId: string) => void) => void;
  onHover: (callback: (nodeId: string | null) => void) => void;
};

function nodeColor(state: ResearchNodeState): number {
  if (state.done) return 0xe8b923; // amber/gold unlocked
  if (state.canAttempt) return 0x7dd87d; // green available
  return 0x4a5568; // grey locked
}

function nodeEmissive(state: ResearchNodeState): number {
  if (state.done) return 0xc9940e;
  if (state.canAttempt) return 0x3d8b3d;
  return 0x1a202c;
}

/**
 * Create the research tree 3D scene. Nodes are laid out in a grid from getResearchTreeRows;
 * segments define edges between consecutive rows.
 */
const NODE_DISC_RADIUS = 0.46;
const NODE_BG_COLOR = 0x252a33;

export function createResearchTreeScene(input: ResearchTreeSceneInput): ResearchTreeScene {
  const { rows, segments, stateById, getSpriteIndexForNode } = input;
  const resolveSpriteIndex = getSpriteIndexForNode ?? (() => 0);
  const textureLoader = new THREE.TextureLoader();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0e12);

  const camera = new THREE.OrthographicCamera(
    -ORTHO_SIZE_BASE,
    ORTHO_SIZE_BASE,
    ORTHO_SIZE_BASE,
    -ORTHO_SIZE_BASE,
    0.1,
    200
  );
  camera.position.set(0, 0, CAMERA_Z);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(400, 400);
  renderer.setClearColor(0x0c0e12, 1);

  /* Build node positions and meshes: each node is a disc showing the logo (icon texture) + ring frame + progress arc */
  type NodeEntry = {
    node: ResearchNode;
    rowIdx: number;
    colIdx: number;
    mesh: THREE.Mesh;
    ring: THREE.Mesh;
    progressArc: THREE.Line;
    progressArcGeo: THREE.BufferGeometry;
  };
  const nodeEntries: NodeEntry[] = [];
  const nodeMeshById = new Map<string, NodeEntry>();
  const iconMaterialsWithIndex: { material: THREE.MeshBasicMaterial; spriteIndex: number }[] = [];
  const ringColorByState = new Map<string, number>();
  let currentStateById: Record<string, ResearchNodeState> = stateById;
  let progressById: Record<string, ResearchProgressData | null> = {};

  const totalRows = rows.length;
  for (let r = 0; r < totalRows; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const node = row[c];
      const x = c * NODE_SPACING_X - ((row.length - 1) * NODE_SPACING_X) / 2;
      const y = (totalRows - 1 - r) * NODE_SPACING_Y;
      const spriteIndex = resolveSpriteIndex(node.id);

      const discGeo = new THREE.CircleGeometry(NODE_DISC_RADIUS, 32);
      const discMat = new THREE.MeshBasicMaterial({
        color: NODE_BG_COLOR,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(discGeo, discMat);
      mesh.position.set(x, y, 0);
      mesh.userData = { nodeId: node.id };
      scene.add(mesh);

      iconMaterialsWithIndex.push({ material: discMat, spriteIndex });

      const state = stateById[node.id] ?? { done: false, canAttempt: false };
      const ringColor = nodeColor(state);
      const ringGeo = new THREE.RingGeometry(NODE_RING_INNER, NODE_RING_OUTER, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(x, y, 0.01);
      ring.userData = { nodeId: node.id };
      scene.add(ring);

      const progressArcGeo = new THREE.BufferGeometry();
      const progressArcMat = new THREE.LineBasicMaterial({
        color: PROGRESS_ARC_COLOR,
        linewidth: 1,
        transparent: true,
        opacity: 0.95,
      });
      const progressArc = new THREE.Line(progressArcGeo, progressArcMat);
      progressArc.position.set(x, y, 0.02);
      progressArc.visible = false;
      scene.add(progressArc);

      const entry: NodeEntry = { node, rowIdx: r, colIdx: c, mesh, ring, progressArc, progressArcGeo };
      ringColorByState.set(node.id, ringColor);
      nodeEntries.push(entry);
      nodeMeshById.set(node.id, entry);
    }
  }

  const PROGRESS_ARC_SEGMENTS = 32;
  function updateProgressArc(entry: NodeEntry, pct: number): void {
    const arc = entry.progressArc;
    const geo = entry.progressArcGeo;
    if (pct <= 0) {
      arc.visible = false;
      return;
    }
    arc.visible = true;
    const segments = Math.max(2, Math.ceil(PROGRESS_ARC_SEGMENTS * pct));
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * pct * Math.PI * 2;
      points.push(new THREE.Vector3(NODE_RING_MID * Math.cos(t), NODE_RING_MID * Math.sin(t), 0));
    }
    geo.setFromPoints(points);
    const posAttr = geo.attributes.position;
    if (posAttr && 'needsUpdate' in posAttr) (posAttr as THREE.BufferAttribute).needsUpdate = true;
  }

  const loadedIconTextures: THREE.Texture[] = [];
  textureLoader.load(SPRITE_URL, (spriteTex) => {
    spriteTex.flipY = true;
    spriteTex.needsUpdate = true;
    for (const { material, spriteIndex } of iconMaterialsWithIndex) {
      const clone = spriteTex.clone();
      const col = spriteIndex % SPRITE_COLS;
      const row = Math.floor(spriteIndex / SPRITE_COLS);
      clone.repeat.set(1 / SPRITE_COLS, 1 / SPRITE_ROWS);
      clone.offset.set(col / SPRITE_COLS, 1 - (row + 1) / SPRITE_ROWS);
      clone.needsUpdate = true;
      loadedIconTextures.push(clone);
      material.map = clone;
      material.color.setHex(0xffffff);
      material.needsUpdate = true;
    }
  });

  /* Edges: line segments from each prerequisite to its child (any row span) */
  const edgePoints: THREE.Vector3[] = [];
  for (let i = 0; i < segments.length; i++) {
    const { fromRow, fromIdx, toRow, toIdx } = segments[i];
    const parentRow = rows[fromRow];
    const childRow = rows[toRow];
    if (!parentRow || !childRow) continue;
    const fromNode = parentRow[fromIdx];
    const toNode = childRow[toIdx];
    if (!fromNode || !toNode) continue;
    const fromEntry = nodeMeshById.get(fromNode.id);
    const toEntry = nodeMeshById.get(toNode.id);
    if (!fromEntry || !toEntry) continue;
    edgePoints.push(
      new THREE.Vector3(
        fromEntry.mesh.position.x,
        fromEntry.mesh.position.y,
        fromEntry.mesh.position.z
      ),
      new THREE.Vector3(
        toEntry.mesh.position.x,
        toEntry.mesh.position.y,
        toEntry.mesh.position.z
      )
    );
  }

  const edgeGeos: THREE.BufferGeometry[] = [];
  const edgeMats: THREE.LineBasicMaterial[] = [];
  const edgeSegmentIds: { fromId: string; toId: string }[] = [];
  for (let i = 0; i < edgePoints.length; i += 2) {
    const a = edgePoints[i];
    const b = edgePoints[i + 1];
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const mat = new THREE.LineBasicMaterial({ color: EDGE_DEFAULT, linewidth: 1 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    edgeGeos.push(geo);
    edgeMats.push(mat);
  }
  /* Rebuild edgeSegmentIds in same order as segments/edgePoints */
  edgeSegmentIds.length = 0;
  for (let i = 0; i < segments.length; i++) {
    const { fromRow, fromIdx, toRow, toIdx } = segments[i];
    const fromNode = rows[fromRow]?.[fromIdx];
    const toNode = rows[toRow]?.[toIdx];
    if (fromNode && toNode) edgeSegmentIds.push({ fromId: fromNode.id, toId: toNode.id });
  }

  /* Pan & zoom. Default = max zoom, top of tree slightly below top of canvas. */
  const sizeX0 = ORTHO_SIZE_BASE / 3;
  const sizeY0 = (ORTHO_SIZE_BASE * ORTHO_HEIGHT_FACTOR) / 3;
  let panX = 0;
  let panY = (totalRows - 1) * NODE_SPACING_Y - sizeY0 + 2.5;
  let zoom = 3;
  let canvasW = 400;
  let canvasH = 400;
  let isPointerDown = false;
  let didPan = false;
  let prevClientX = 0;
  let prevClientY = 0;

  const canvas = renderer.domElement;
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';

  /** Ortho extents so that sizeX/sizeY = canvasW/canvasH → node circles stay round when canvas is resized. */
  function getOrthoExtents(): { sizeX: number; sizeY: number } {
    const aspect = canvasW / canvasH;
    const sizeY = (ORTHO_SIZE_BASE * ORTHO_HEIGHT_FACTOR) / zoom;
    const sizeX = sizeY * aspect;
    return { sizeX, sizeY };
  }

  function updateCamera(): void {
    const { sizeX, sizeY } = getOrthoExtents();
    camera.left = -sizeX + panX;
    camera.right = sizeX + panX;
    camera.top = sizeY + panY;
    camera.bottom = -sizeY + panY;
    camera.updateProjectionMatrix();
  }

  function onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    isPointerDown = true;
    didPan = false;
    prevClientX = e.clientX;
    prevClientY = e.clientY;
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent): void {
    if (isPointerDown) {
      const { sizeX, sizeY } = getOrthoExtents();
      const dx = (e.clientX - prevClientX) * (sizeX * 2 / canvas.clientWidth);
      const dy = -(e.clientY - prevClientY) * (sizeY * 2 / canvas.clientHeight);
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) didPan = true;
      panX -= dx;
      panY -= dy;
      prevClientX = e.clientX;
      prevClientY = e.clientY;
      updateCamera();
    } else {
      /* Hover: raycaster to detect node under pointer */
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(nodeEntries.map((e) => e.mesh));
      const nodeId = hits.length > 0 && (hits[0].object.userData?.nodeId as string | undefined)
        ? (hits[0].object.userData.nodeId as string)
        : null;
      if (nodeId !== lastHoveredNodeId) {
        lastHoveredNodeId = nodeId;
        hoverCallback?.(nodeId);
      }
      if (!nodeId) {
        canvas.style.cursor = 'grab';
      } else {
        const state = currentStateById[nodeId];
        const canUnlock = state?.canAttempt === true && !state?.done;
        canvas.style.cursor = canUnlock ? 'pointer' : 'not-allowed';
      }
    }
  }

  function onPointerUp(e: PointerEvent): void {
    isPointerDown = false;
    if (!lastHoveredNodeId) {
      canvas.style.cursor = 'grab';
    } else {
      const state = currentStateById[lastHoveredNodeId];
      const canUnlock = state?.canAttempt === true && !state?.done;
      canvas.style.cursor = canUnlock ? 'pointer' : 'not-allowed';
    }
    canvas.releasePointerCapture(e.pointerId);
  }

  const ZOOM_MIN = 0.3;
  const ZOOM_MAX = 6;

  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom * factor));
    updateCamera();
  }

  /* Raycaster for node pick and hover */
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let pickCallback: ((nodeId: string) => void) | null = null;
  let hoverCallback: ((nodeId: string | null) => void) | null = null;
  let lastHoveredNodeId: string | null = null;

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  function onCanvasClick(e: MouseEvent): void {
    if (didPan) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const meshes = nodeEntries.map((e) => e.mesh);
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length > 0 && hits[0].object.userData?.nodeId) {
      const nodeId = hits[0].object.userData.nodeId as string;
      pickCallback?.(nodeId);
    }
  }
  canvas.addEventListener('click', onCanvasClick);

  function setState(newStateById: Record<string, ResearchNodeState>): void {
    currentStateById = newStateById;
    for (const entry of nodeEntries) {
      const state = newStateById[entry.node.id] ?? { done: false, canAttempt: false };
      const color = nodeColor(state);
      ringColorByState.set(entry.node.id, color);
      const ringMat = entry.ring.material as THREE.MeshBasicMaterial;
      if (!highlightPathIds.includes(entry.node.id)) {
        ringMat.color.setHex(color);
        ringMat.opacity = 0.85;
      }
    }
  }

  function setProgress(data: Record<string, ResearchProgressData | null>): void {
    progressById = data;
  }

  let highlightPathIds: string[] = [];
  function setHighlightPath(nodeIds: string[] | null): void {
    highlightPathIds = nodeIds ?? [];
    const pathSet = new Set(highlightPathIds);
    for (const entry of nodeEntries) {
      const inPath = pathSet.has(entry.node.id);
      const ringMat = entry.ring.material as THREE.MeshBasicMaterial;
      if (inPath) {
        ringMat.color.setHex(PATH_HIGHLIGHT_COLOR);
        ringMat.opacity = 1;
      } else {
        const color = ringColorByState.get(entry.node.id) ?? 0x4a5568;
        ringMat.color.setHex(color);
        ringMat.opacity = 0.85;
      }
    }
    for (let i = 0; i < edgeSegmentIds.length; i++) {
      const { fromId, toId } = edgeSegmentIds[i];
      const fromIdx = highlightPathIds.indexOf(fromId);
      const toIdx = highlightPathIds.indexOf(toId);
      const inPath = fromIdx >= 0 && toIdx >= 0 && fromIdx === toIdx - 1;
      edgeMats[i].color.setHex(inPath ? EDGE_PATH : EDGE_DEFAULT);
    }
  }

  function zoomIn(): void {
    zoom = Math.min(ZOOM_MAX, zoom * 1.2);
    updateCamera();
  }

  function zoomOut(): void {
    zoom = Math.max(ZOOM_MIN, zoom / 1.2);
    updateCamera();
  }

  function onNodePick(cb: (nodeId: string) => void): void {
    pickCallback = cb;
  }

  function onHover(cb: (nodeId: string | null) => void): void {
    hoverCallback = cb;
  }

  let animId: number | null = null;
  function animate(): void {
    animId = requestAnimationFrame(animate);
    const now = Date.now();
    for (const entry of nodeEntries) {
      const p = progressById[entry.node.id];
      if (!p || now > p.endTimeMs + 50) {
        updateProgressArc(entry, 0);
        continue;
      }
      const remainingMs = Math.max(0, p.endTimeMs - now);
      const elapsed = p.totalDurationMs - remainingMs;
      const pct = p.totalDurationMs > 0 ? Math.min(1, elapsed / p.totalDurationMs) : 0;
      updateProgressArc(entry, pct);
    }
    renderer.render(scene, camera);
  }
  animate();
  updateCamera();

  function resize(w: number, h: number): void {
    canvasW = w;
    canvasH = h;
    renderer.setSize(w, h);
    updateCamera();
  }

  function dispose(): void {
    if (animId != null) cancelAnimationFrame(animId);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('click', onCanvasClick);
    for (const entry of nodeEntries) {
      entry.mesh.geometry.dispose();
      (entry.mesh.material as THREE.Material).dispose();
      entry.ring.geometry.dispose();
      (entry.ring.material as THREE.Material).dispose();
      entry.progressArcGeo.dispose();
      (entry.progressArc.material as THREE.Material).dispose();
    }
    for (const tex of loadedIconTextures) tex.dispose();
    for (const g of edgeGeos) g.dispose();
    for (const m of edgeMats) m.dispose();
    renderer.dispose();
  }

  return {
    resize,
    dispose,
    domElement: canvas,
    setState,
    setHighlightPath,
    setProgress,
    zoomIn,
    zoomOut,
    onNodePick,
    onHover,
  };
}
