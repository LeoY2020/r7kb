'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { Concept, Subject } from '@/lib/types';
import { matchQuery, valueOfSlider, type GraphSettings } from '@/lib/graph-settings';

type GraphCanvasProps = {
  concepts: Concept[];
  subjects: Subject[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  settings: GraphSettings;
  className?: string;
};

type GNode = {
  id: string;
  label: string;
  path: string;
  type: 'file' | 'tag';
  tags: string[];
  color?: string;
  weight: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  /** 透明度过渡值（1 = 高亮，0.2 = 淡出） */
  fade: number;
  /** 颜色过渡值（0 = 默认色，1 = 强调色） */
  near: number;
};

type GLink = {
  source: GNode;
  target: GNode;
  kind: 'pre' | 'rel' | 'tag';
  fade: number;
  near: number;
};

type Palette = {
  node: string;
  nodeTag: string;
  focused: string;
  line: string;
  lineHighlight: string;
  text: string;
};

const FALLBACK_PALETTE: Palette = {
  node: '138,138,144',
  nodeTag: '52,168,110',
  focused: '0,113,227',
  line: '138,138,144',
  lineHighlight: '0,113,227',
  text: '29,29,31',
};

/** 与 Obsidian 渲染层一致的常量 */
const NODE_MIN = 8;
const NODE_MAX = 30;
const COLLIDE_RADIUS = 60;
const ALPHA_MIN = 0.001;
const ALPHA_DECAY = 1 - Math.pow(ALPHA_MIN, 1 / 300);
const VELOCITY_DECAY = 0.6;
const DIM_ALPHA = 0.2;

function readPalette(canvas: HTMLCanvasElement): Palette {
  const style = getComputedStyle(canvas);
  const read = (name: string, fallback: string) => {
    const value = style.getPropertyValue(name).trim();
    return value || fallback;
  };
  return {
    node: read('--graph-node', FALLBACK_PALETTE.node),
    nodeTag: read('--graph-node-tag', FALLBACK_PALETTE.nodeTag),
    focused: read('--graph-node-focused', FALLBACK_PALETTE.focused),
    line: read('--graph-line', FALLBACK_PALETTE.line),
    lineHighlight: read('--graph-line-highlight', FALLBACK_PALETTE.lineHighlight),
    text: read('--graph-text', FALLBACK_PALETTE.text),
  };
}

function rgba(rgb: string, alpha: number): string {
  const parts = rgb.trim().split(/[\s,]+/).join(', ');
  return `rgba(${parts}, ${alpha})`;
}

/** 两个 "r g b" / "r, g, b" 颜色按 t 混合 */
function mixRgb(from: string, to: string, t: number): string {
  if (t <= 0.001) return from;
  if (t >= 0.999) return to;
  const a = from.trim().split(/[\s,]+/).map(Number);
  const b = to.trim().split(/[\s,]+/).map(Number);
  return a.map((value, index) => Math.round(value + ((b[index] ?? value) - value) * t)).join(', ');
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export default function GraphCanvas({
  concepts,
  subjects,
  selectedId,
  onSelect,
  settings,
  className,
}: GraphCanvasProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const selectedRef = useRef(selectedId ?? null);
  selectedRef.current = selectedId ?? null;
  const subjectsRef = useRef(subjects);
  subjectsRef.current = subjects;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const data = useMemo(() => buildGraphData(concepts, subjects, settings), [concepts, subjects, settings]);
  const dataRef = useRef(data);
  dataRef.current = data;

  const stateRef = useRef({
    nodes: new Map<string, GNode>(),
    links: [] as GLink[],
    neighbors: new Map<string, Set<string>>(),
    alpha: 1,
    scale: 1,
    targetScale: 1,
    panX: 0,
    panY: 0,
    hoverId: null as string | null,
    dragId: null as string | null,
    pointer: { x: 0, y: 0, downX: 0, downY: 0, moved: false, panning: false },
    zoomCenter: { x: 0, y: 0 },
    pointers: new Map<number, { x: number; y: number }>(),
    pinch: null as null | { distance: number; scale: number; midX: number; midY: number },
    fitted: false,
    dirty: true,
  });

  // 数据变化：保留已有坐标，新节点按黄金角铺开
  useEffect(() => {
    const state = stateRef.current;
    const next = new Map<string, GNode>();
    let index = 0;
    for (const item of data.nodes) {
      const existing = state.nodes.get(item.id);
      const angle = index * 2.399963229728653;
      const radius = 90 + 40 * Math.sqrt(index);
      next.set(item.id, {
        ...item,
        weight: 0,
        x: existing?.x ?? Math.cos(angle) * radius,
        y: existing?.y ?? Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
        fade: existing?.fade ?? 1,
        near: existing?.near ?? 0,
      });
      index += 1;
    }
    const links: GLink[] = [];
    const degree = new Map<string, number>();
    for (const link of data.links) {
      const source = next.get(link.source);
      const target = next.get(link.target);
      if (!source || !target) continue;
      links.push({ source, target, kind: link.kind, fade: 1, near: 0 });
      degree.set(source.id, (degree.get(source.id) ?? 0) + 1);
      degree.set(target.id, (degree.get(target.id) ?? 0) + 1);
    }
    const neighbors = new Map<string, Set<string>>();
    for (const link of links) {
      if (!neighbors.has(link.source.id)) neighbors.set(link.source.id, new Set());
      if (!neighbors.has(link.target.id)) neighbors.set(link.target.id, new Set());
      neighbors.get(link.source.id)!.add(link.target.id);
      neighbors.get(link.target.id)!.add(link.source.id);
    }
    for (const node of next.values()) node.weight = degree.get(node.id) ?? 0;
    state.nodes = next;
    state.links = links;
    state.neighbors = neighbors;
    state.alpha = 0.6;
    state.fitted = false;
    state.dirty = true;
  }, [data]);

  // 力参数变化时重新加热
  useEffect(() => {
    stateRef.current.alpha = Math.max(stateRef.current.alpha, 0.3);
    stateRef.current.dirty = true;
  }, [
    settings.centerStrength,
    settings.repelStrength,
    settings.linkStrength,
    settings.linkDistance,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let palette = readPalette(canvas);
    const themeObserver = new MutationObserver(() => {
      palette = readPalette(canvas);
      stateRef.current.dirty = true;
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      stateRef.current.dirty = true;
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrap);

    const state = stateRef.current;

    const nodeRadius = (node: GNode, cfg: GraphSettings) =>
      cfg.nodeSizeMultiplier * Math.max(NODE_MIN, Math.min(Math.sqrt(node.weight + 1) * 3, NODE_MAX));
    const screenRadius = (node: GNode) =>
      nodeRadius(node, settingsRef.current) * Math.sqrt(1 / state.scale) * state.scale;

    /* -------------------------- 力导向模拟 -------------------------- */

    const tick = (cfg: GraphSettings) => {
      const center = valueOfSlider(cfg.centerStrength, 0.01);
      const linkStrength = valueOfSlider(cfg.linkStrength, 0.01);
      const repel = -Math.pow(cfg.repelStrength, 3) || -1;
      const linkDistance = cfg.linkDistance;

      state.alpha += (0 - state.alpha) * ALPHA_DECAY;
      const alpha = state.alpha;

      // 向心力（Obsidian 的 forceX / forceY）
      for (const node of state.nodes.values()) {
        if (node.fx !== null) continue;
        node.vx += (0 - node.x) * center * alpha;
        node.vy += (0 - node.y) * center * alpha;
      }

      // 连线弹簧
      for (const link of state.links) {
        const { source, target } = link;
        let dx = target.x + target.vx - source.x - source.vx;
        let dy = target.y + target.vy - source.y - source.vy;
        if (dx === 0 && dy === 0) {
          dx = (Math.random() - 0.5) * 1e-6;
          dy = (Math.random() - 0.5) * 1e-6;
        }
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) continue;
        const strength = linkStrength / Math.min(source.weight, target.weight);
        const k = ((distance - linkDistance) / distance) * alpha * strength;
        dx *= k;
        dy *= k;
        const bias = source.weight / (source.weight + target.weight || 1);
        target.vx -= dx * bias;
        target.vy -= dy * bias;
        source.vx += dx * (1 - bias);
        source.vy += dy * (1 - bias);
      }

      // 库仑斥力（manyBody，distanceMin = 30）
      const nodes = Array.from(state.nodes.values());
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let distance2 = dx * dx + dy * dy;
          if (distance2 === 0) {
            dx = (Math.random() - 0.5) * 1e-6;
            dy = (Math.random() - 0.5) * 1e-6;
            distance2 = dx * dx + dy * dy;
          }
          if (distance2 < 900) distance2 = Math.sqrt(900 * distance2);
          const force = (repel * alpha) / distance2;
          a.vx += dx * force;
          a.vy += dy * force;
          b.vx -= dx * force;
          b.vy -= dy * force;
        }
      }

      // 碰撞半径 60，避免节点重叠
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        const ra = nodeRadius(a, cfg) * 0.6 + COLLIDE_RADIUS * 0.4;
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const rb = nodeRadius(b, cfg) * 0.6 + COLLIDE_RADIUS * 0.4;
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const min = ra + rb;
          if (distance < min) {
            const push = ((min - distance) / distance) * 0.5;
            dx *= push;
            dy *= push;
            a.vx -= dx;
            a.vy -= dy;
            b.vx += dx;
            b.vy += dy;
          }
        }
      }

      // 积分
      for (const node of state.nodes.values()) {
        if (node.fx !== null) {
          node.x = node.fx;
          node.vx = 0;
        } else {
          node.x += node.vx;
          node.vx *= VELOCITY_DECAY;
        }
        if (node.fy !== null) {
          node.y = node.fy;
          node.vy = 0;
        } else {
          node.y += node.vy;
          node.vy *= VELOCITY_DECAY;
        }
      }
      return alpha > ALPHA_MIN;
    };

    /* ---------------------------- 缩放动画 ---------------------------- */

    const animateZoom = () => {
      const diff = state.targetScale - state.scale;
      if (Math.abs(diff) / Math.max(state.targetScale, 1e-6) < 0.01) {
        state.scale = state.targetScale;
        return false;
      }
      const next = state.scale + diff * 0.15;
      const worldX = (state.zoomCenter.x - state.panX) / state.scale;
      const worldY = (state.zoomCenter.y - state.panY) / state.scale;
      state.scale = next;
      state.panX = state.zoomCenter.x - worldX * next;
      state.panY = state.zoomCenter.y - worldY * next;
      return true;
    };

    /* ------------------------------ 绘制 ------------------------------ */

    const draw = () => {
      const cfg = settingsRef.current;
      const selected = selectedRef.current;
      const hover = state.hoverId;
      const highlightId = state.dragId ?? hover ?? selected;
      const highlight = highlightId ? state.nodes.get(highlightId) : null;
      const neighbors = highlightId ? state.neighbors.get(highlightId) : null;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const scale = state.scale;
      const labelFade = Math.max(0, Math.min(1, Math.log2(scale) + 1 - cfg.textFadeMultiplier));
      const arrowFade = Math.max(0, Math.min(1, (scale - 0.3) * 2));

      const toScreen = (node: GNode) => ({
        x: state.panX + node.x * scale,
        y: state.panY + node.y * scale,
      });

      // 高亮切换的过渡（每帧向目标值靠近，和 Obsidian 的 0.9 平滑类似）
      const SMOOTH = 0.18;
      let animating = false;
      const step = (item: { fade: number; near: number }, fadeTarget: number, nearTarget: number) => {
        item.fade += (fadeTarget - item.fade) * SMOOTH;
        item.near += (nearTarget - item.near) * SMOOTH;
        if (Math.abs(item.fade - fadeTarget) > 0.004 || Math.abs(item.near - nearTarget) > 0.004) {
          animating = true;
        }
      };

      // 连线
      for (const link of state.links) {
        const a = toScreen(link.source);
        const b = toScreen(link.target);
        const connected = !highlightId || highlightId === link.source.id || highlightId === link.target.id;
        const isHighlight = highlightId !== null && connected;
        step(link, connected ? 1 : DIM_ALPHA, isHighlight ? 1 : 0);

        ctx.strokeStyle = rgba(mixRgb(palette.line, palette.lineHighlight, link.near), (0.38 + 0.17 * link.near) * link.fade);
        ctx.lineWidth = cfg.lineSizeMultiplier;
        if (link.kind === 'rel') ctx.setLineDash([5, 5]);
        else ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);

        if (cfg.showArrow && link.kind === 'pre') {
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.hypot(dx, dy);
          const targetRadius = screenRadius(link.target);
          if (distance > targetRadius + cfg.lineSizeMultiplier) {
            const angle = Math.atan2(dy, dx);
            const size = 2 * Math.sqrt(cfg.lineSizeMultiplier);
            const tipX = b.x - (dx / distance) * (targetRadius + 1);
            const tipY = b.y - (dy / distance) * (targetRadius + 1);
            ctx.fillStyle = rgba(palette.text, 0.55 * arrowFade * link.fade);
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(
              tipX - Math.cos(angle - Math.PI / 7) * size * 2,
              tipY - Math.sin(angle - Math.PI / 7) * size * 2
            );
            ctx.lineTo(
              tipX - Math.cos(angle + Math.PI / 7) * size * 2,
              tipY - Math.sin(angle + Math.PI / 7) * size * 2
            );
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // 节点与标签
      for (const node of state.nodes.values()) {
        const point = toScreen(node);
        const radius = screenRadius(node);
        const isHighlight = highlightId === node.id;
        const connected = !highlightId || isHighlight || (neighbors?.has(node.id) ?? false);
        step(node, connected ? 1 : DIM_ALPHA, isHighlight ? 1 : 0);
        if (point.x < -radius - 120 || point.x > width + radius + 120) continue;
        if (point.y < -radius - 120 || point.y > height + radius + 120) continue;

        let base = palette.node;
        if (node.type === 'tag') base = palette.nodeTag;
        if (node.color) base = hexToRgb(node.color) ?? base;

        ctx.globalAlpha = node.fade;
        ctx.fillStyle = rgba(mixRgb(base, palette.focused, node.near), 0.95);
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // 选中 / 悬停 / 拖拽：Obsidian 的一圈细描边
        if (node.near > 0.01) {
          ctx.strokeStyle = rgba(palette.focused, 0.9 * node.near);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(point.x, point.y, radius + 0.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (labelFade > 0.001) {
          const fontSize = (14 + radius / 4) * 1;
          ctx.font = `500 ${fontSize}px ui-sans-serif, -apple-system, "Segoe UI", "Microsoft YaHei Light", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const textAlpha = (labelFade * (1 - node.near) + node.near) * node.fade;
          ctx.fillStyle = rgba(palette.text, textAlpha);
          const maxWidth = 260;
          ctx.fillText(truncate(ctx, node.label, maxWidth), point.x, point.y + radius + 5);
        }
        ctx.globalAlpha = 1;
      }

      return animating;
    };

    /* ---------------------------- 主循环 ---------------------------- */

    const fitView = () => {
      const nodes = Array.from(state.nodes.values());
      if (nodes.length === 0) return;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const node of nodes) {
        minX = Math.min(minX, node.x);
        maxX = Math.max(maxX, node.x);
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y);
      }
      const pad = 90;
      const scale = Math.min(
        3.5,
        Math.max(0.05, Math.min(width / (maxX - minX + pad * 2 || 1), height / (maxY - minY + pad * 2 || 1)))
      );
      state.scale = scale;
      state.targetScale = scale;
      state.panX = width / 2 - ((minX + maxX) / 2) * scale;
      state.panY = height / 2 - ((minY + maxY) / 2) * scale;
      state.dirty = true;
    };

    let raf = 0;
    let running = true;
    const frame = () => {
      if (!running) return;
      const cfg = settingsRef.current;
      let moving = false;
      if (state.alpha > ALPHA_MIN) moving = tick(cfg) || moving;
      if (animateZoom()) moving = true;
      if (!state.fitted && state.alpha < 0.06 && state.nodes.size > 0) {
        fitView();
        state.fitted = true;
        moving = true;
      }
      if (moving || state.dirty) {
        state.dirty = draw();
      }
      raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);

    /* ---------------------------- 交互 ---------------------------- */

    const hitTest = (clientX: number, clientY: number): GNode | null => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      let found: GNode | null = null;
      let best = Infinity;
      for (const node of state.nodes.values()) {
        const sx = state.panX + node.x * state.scale;
        const sy = state.panY + node.y * state.scale;
        const r = screenRadius(node) + 6;
        const d = Math.hypot(sx - x, sy - y);
        if (d <= r && d < best) {
          best = d;
          found = node;
        }
      }
      return found;
    };

    const onPointerDown = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId);
      state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      // 双指：进入捏合缩放（触屏与触控板）
      if (state.pointers.size === 2) {
        if (state.dragId) {
          const dragged = state.nodes.get(state.dragId);
          if (dragged) {
            dragged.fx = null;
            dragged.fy = null;
          }
          state.dragId = null;
        }
        state.pointer.panning = false;
        const rect = canvas.getBoundingClientRect();
        const [a, b] = Array.from(state.pointers.values());
        state.pinch = {
          distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          scale: state.scale,
          midX: (a.x + b.x) / 2 - rect.left,
          midY: (a.y + b.y) / 2 - rect.top,
        };
        state.pointer.moved = true;
        return;
      }

      const node = hitTest(event.clientX, event.clientY);
      state.pointer.downX = event.clientX;
      state.pointer.downY = event.clientY;
      state.pointer.moved = false;
      if (node) {
        state.dragId = node.id;
        const rect = canvas.getBoundingClientRect();
        node.fx = (event.clientX - rect.left - state.panX) / state.scale;
        node.fy = (event.clientY - rect.top - state.panY) / state.scale;
        state.alpha = Math.max(state.alpha, 0.3);
        state.dirty = true;
      } else {
        state.pointer.panning = true;
        state.pointer.x = event.clientX;
        state.pointer.y = event.clientY;
        canvas.style.cursor = 'grabbing';
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (state.pointers.has(event.pointerId)) {
        state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }
      const rect = canvas.getBoundingClientRect();

      // 双指捏合 + 双指平移
      if (state.pinch && state.pointers.size >= 2) {
        const [a, b] = Array.from(state.pointers.values());
        const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
        const midX = (a.x + b.x) / 2 - rect.left;
        const midY = (a.y + b.y) / 2 - rect.top;
        const nextScale = Math.min(8, Math.max(1 / 128, state.pinch.scale * (distance / state.pinch.distance)));
        const worldX = (midX - state.panX) / state.scale;
        const worldY = (midY - state.panY) / state.scale;
        state.scale = nextScale;
        state.targetScale = nextScale;
        state.panX = midX - worldX * nextScale;
        state.panY = midY - worldY * nextScale;
        state.panX += midX - state.pinch.midX;
        state.panY += midY - state.pinch.midY;
        state.pinch.midX = midX;
        state.pinch.midY = midY;
        state.pointer.moved = true;
        state.dirty = true;
        return;
      }

      if (state.dragId) {
        const node = state.nodes.get(state.dragId);
        if (node) {
          node.fx = (event.clientX - rect.left - state.panX) / state.scale;
          node.fy = (event.clientY - rect.top - state.panY) / state.scale;
          state.alpha = Math.max(state.alpha, 0.2);
          state.dirty = true;
        }
        state.pointer.moved = true;
        return;
      }
      if (state.pointer.panning) {
        state.panX += event.clientX - state.pointer.x;
        state.panY += event.clientY - state.pointer.y;
        state.pointer.x = event.clientX;
        state.pointer.y = event.clientY;
        if (Math.abs(event.clientX - state.pointer.downX) + Math.abs(event.clientY - state.pointer.downY) > 4) {
          state.pointer.moved = true;
        }
        state.dirty = true;
        return;
      }
      const node = hitTest(event.clientX, event.clientY);
      const nextHover = node?.id ?? null;
      canvas.style.cursor = node ? 'pointer' : 'grab';
      if (nextHover !== state.hoverId) {
        state.hoverId = nextHover;
        state.dirty = true;
      }
    };

    const endPointer = (event: PointerEvent) => {
      state.pointers.delete(event.pointerId);
      if (state.pinch) {
        if (state.pointers.size < 2) {
          state.pinch = null;
          state.targetScale = state.scale;
          state.dirty = true;
        }
        return;
      }
      const moved =
        Math.abs(event.clientX - state.pointer.downX) + Math.abs(event.clientY - state.pointer.downY) > 4;
      if (state.dragId) {
        const draggedId = state.dragId;
        const node = state.nodes.get(draggedId);
        if (node) {
          node.fx = null;
          node.fy = null;
        }
        state.alpha = Math.max(state.alpha, 0.15);
        state.dragId = null;
        if (!moved) onSelectRef.current?.(draggedId);
      }
      if (state.pointer.panning) {
        state.pointer.panning = false;
        if (!state.pointer.moved) {
          const clicked = hitTest(event.clientX, event.clientY);
          if (clicked) onSelectRef.current?.(clicked.id);
        }
      }
      canvas.style.cursor = 'grab';
      state.dirty = true;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const direction = event.deltaY > 0 ? 1 / 1.2 : 1.2;
      state.targetScale = Math.min(8, Math.max(1 / 128, state.targetScale * direction));
      state.zoomCenter = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      state.dirty = true;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerleave', () => {
      if (!state.dragId && !state.pointer.panning && state.hoverId !== null) {
        state.hoverId = null;
        state.dirty = true;
      }
    });

    // 暴露少量命令给按钮
    (canvas as unknown as { __graph?: unknown }).__graph = {
      zoomIn: () => {
        state.zoomCenter = { x: width / 2, y: height / 2 };
        state.targetScale = Math.min(8, state.targetScale * 1.4);
        state.dirty = true;
      },
      zoomOut: () => {
        state.zoomCenter = { x: width / 2, y: height / 2 };
        state.targetScale = Math.max(1 / 128, state.targetScale / 1.4);
        state.dirty = true;
      },
      fit: fitView,
    };

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endPointer);
      canvas.removeEventListener('pointercancel', endPointer);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, []);

  return (
    <div ref={wrapRef} className={`graph-view relative h-[520px] w-full ${className ?? ''}`}>
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
      <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-lg border border-line bg-surface/90 shadow-soft backdrop-blur">
        {[
          { label: '+', title: '放大', action: 'zoomIn' },
          { label: '−', title: '缩小', action: 'zoomOut' },
          { label: '⤢', title: '适应视图', action: 'fit' },
        ].map((button) => (
          <button
            key={button.action}
            type="button"
            title={button.title}
            onClick={() => {
              const canvas = canvasRef.current as unknown as { __graph?: Record<string, () => void> } | null;
              canvas?.__graph?.[button.action]?.();
            }}
            className="h-8 w-8 text-[13px] text-ink-muted transition-colors hover:bg-elevated hover:text-ink"
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 数据组装                                                            */
/* ------------------------------------------------------------------ */

type BuiltData = {
  nodes: { id: string; label: string; path: string; type: 'file' | 'tag'; tags: string[]; color?: string }[];
  links: { source: string; target: string; kind: 'pre' | 'rel' | 'tag' }[];
};

function buildGraphData(concepts: Concept[], _subjects: Subject[], settings: GraphSettings): BuiltData {
  const colorOf = (concept: Concept): string | undefined => {
    for (const group of settings.colorGroups) {
      if (group.query.trim() && matchQuery(group.query, { label: concept.label, path: concept.id, tags: concept.tags ?? [] })) {
        return group.color;
      }
    }
    return undefined;
  };

  const shown = concepts.filter((concept) =>
    matchQuery(settings.search, { label: concept.label, path: concept.id, tags: concept.tags ?? [] })
  );
  const shownIds = new Set(shown.map((c) => c.id));

  const nodes: BuiltData['nodes'] = shown.map((concept) => ({
    id: concept.id,
    label: concept.label,
    path: `/knowledge/${concept.id}/`,
    type: 'file',
    tags: concept.tags ?? [],
    color: colorOf(concept),
  }));

  const links: BuiltData['links'] = [];
  const linked = new Set<string>();
  for (const concept of shown) {
    for (const pre of concept.prerequisites ?? []) {
      if (!shownIds.has(pre)) continue;
      links.push({ source: pre, target: concept.id, kind: 'pre' });
      linked.add(pre);
      linked.add(concept.id);
    }
    for (const rel of concept.related ?? []) {
      if (!shownIds.has(rel) || concept.id > rel) continue;
      links.push({ source: concept.id, target: rel, kind: 'rel' });
      linked.add(concept.id);
      linked.add(rel);
    }
  }

  if (settings.showTags) {
    const tagIds = new Set<string>();
    for (const concept of shown) {
      for (const tag of concept.tags ?? []) {
        const tagId = `tag:${tag}`;
        if (!tagIds.has(tagId)) {
          tagIds.add(tagId);
          nodes.push({ id: tagId, label: `#${tag}`, path: tagId, type: 'tag', tags: [tag] });
        }
        links.push({ source: tagId, target: concept.id, kind: 'tag' });
        linked.add(tagId);
        linked.add(concept.id);
      }
    }
  }

  if (!settings.showOrphans) {
    const keep = new Set(linked);
    return {
      nodes: nodes.filter((node) => keep.has(node.id)),
      links,
    };
  }

  return { nodes, links };
}

function hexToRgb(hex: string): string | null {
  const value = hex.replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  return `${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}`;
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}
