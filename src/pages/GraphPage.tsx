import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LINKS_PATH } from '../lib/notes';
import { useWorkspace } from '../lib/workspace';
import type { Note } from '../lib/types';
import { Button, Icon, useToast } from '../components/ui';

type GNode = { slug: string; title: string; x: number; y: number; degree: number };
type EdgeKind = 'solid' | 'dashed';
type GEdge = { id: string; from: string; to: string; kind: EdgeKind };

type RawLinks = Record<string, { prerequisites: string[]; next: string[]; related: string[] }>;

const POS_KEY = 'r7kb-studio-graph-positions';

function parseLinks(text: string | undefined): RawLinks {
  if (!text) return {};
  try {
    const data = JSON.parse(text) as { links?: RawLinks };
    const links = data?.links ?? {};
    const out: RawLinks = {};
    for (const [slug, value] of Object.entries(links)) {
      out[slug] = {
        prerequisites: Array.isArray(value?.prerequisites) ? value.prerequisites : [],
        next: Array.isArray(value?.next) ? value.next : [],
        related: Array.isArray(value?.related) ? value.related : [],
      };
    }
    return out;
  } catch {
    return {};
  }
}

function buildEdges(links: RawLinks, notes: Note[]): GEdge[] {
  const known = new Set(notes.map((note) => note.slug));
  const map = new Map<string, GEdge>();
  const add = (from: string, to: string, kind: EdgeKind) => {
    if (!known.has(from) || !known.has(to) || from === to) return;
    const id = kind === 'solid' ? `${from}->${to}` : [from, to].sort().join('~');
    if (map.has(id)) return;
    map.set(id, { id, from, to, kind });
  };
  for (const [slug, entry] of Object.entries(links)) {
    for (const target of entry.next) add(slug, target, 'solid');
    for (const source of entry.prerequisites) add(source, slug, 'solid');
    for (const target of entry.related) add(slug, target, 'dashed');
  }
  return [...map.values()];
}

function forceLayout(nodes: GNode[], edges: GEdge[]): GNode[] {
  const width = 1100;
  const height = 640;
  const items = nodes.map((node, index) => ({
    ...node,
    x: width / 2 + Math.cos((index / Math.max(1, nodes.length)) * Math.PI * 2) * 220,
    y: height / 2 + Math.sin((index / Math.max(1, nodes.length)) * Math.PI * 2) * 180,
    vx: 0,
    vy: 0,
  }));
  const index = new Map(items.map((item) => [item.slug, item]));

  for (let tick = 0; tick < 320; tick += 1) {
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i];
        const b = items[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy) || 0.01;
        if (distance > 520) continue;
        const force = 2600 / (distance * distance);
        dx /= distance;
        dy /= distance;
        a.vx -= dx * force;
        a.vy -= dy * force;
        b.vx += dx * force;
        b.vy += dy * force;
      }
    }
    for (const edge of edges) {
      const a = index.get(edge.from);
      const b = index.get(edge.to);
      if (!a || !b) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 0.01;
      const target = edge.kind === 'solid' ? 170 : 220;
      const force = (distance - target) * 0.012;
      dx /= distance;
      dy /= distance;
      a.vx += dx * force;
      a.vy += dy * force;
      b.vx -= dx * force;
      b.vy -= dy * force;
    }
    for (const item of items) {
      item.vx += (width / 2 - item.x) * 0.0025;
      item.vy += (height / 2 - item.y) * 0.0025;
      item.vx *= 0.86;
      item.vy *= 0.86;
      item.x += item.vx;
      item.y += item.vy;
      item.x = Math.max(70, Math.min(width - 70, item.x));
      item.y = Math.max(60, Math.min(height - 60, item.y));
    }
  }
  return items.map(({ slug, title, x, y }) => ({ slug, title, x, y, degree: 0 }));
}

function withDegrees(nodes: GNode[], edges: GEdge[]): GNode[] {
  const degree = new Map<string, number>();
  for (const edge of edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }
  return nodes.map((node) => ({ ...node, degree: degree.get(node.slug) ?? 0 }));
}

export default function GraphPage() {
  const { notes, fileText, updateFile } = useWorkspace();
  const toast = useToast();
  const [nodes, setNodes] = useState<GNode[] | null>(null);
  const [edges, setEdges] = useState<GEdge[]>([]);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [size, setSize] = useState({ w: 900, h: 560 });
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [connect, setConnect] = useState<{ from: string; kind: EdgeKind; x: number; y: number } | null>(
    null,
  );
  const [dragNode, setDragNode] = useState<{ slug: string; dx: number; dy: number } | null>(null);
  const [detach, setDetach] = useState<{ id: string; end: 'from' | 'to'; x: number; y: number } | null>(
    null,
  );
  const [pan, setPan] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const linksText = fileText(LINKS_PATH);

  useEffect(() => {
    if (nodes !== null || notes.length === 0) return;
    const links = parseLinks(linksText);
    const edgeList = buildEdges(links, notes);
    let saved: Record<string, { x: number; y: number }> = {};
    try {
      saved = JSON.parse(localStorage.getItem(POS_KEY) ?? '{}') as typeof saved;
    } catch {
      saved = {};
    }
    const missing = notes.some((note) => !saved[note.slug]);
    const base = forceLayout(
      notes.map((note, index) => ({
        slug: note.slug,
        title: note.title,
        x: 550,
        y: 320,
        degree: 0,
        ...(missing ? {} : saved[note.slug]),
        ...(index === 0 && missing ? {} : {}),
      })),
      edgeList,
    );
    const finalNodes = notes.map((note, index) => {
      const position = saved[note.slug] ?? { x: base[index].x, y: base[index].y };
      return { slug: note.slug, title: note.title, x: position.x, y: position.y, degree: 0 };
    });
    setNodes(withDegrees(finalNodes, edgeList));
    setEdges(edgeList);
  }, [notes, linksText, nodes]);

  useEffect(() => {
    const element = shellRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setSize({ w: element.clientWidth, h: element.clientHeight });
    });
    observer.observe(element);
    setSize({ w: element.clientWidth, h: element.clientHeight });
    return () => observer.disconnect();
  }, []);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GNode>();
    for (const node of nodes ?? []) map.set(node.slug, node);
    return map;
  }, [nodes]);

  const toGraph = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const matrix = svg.getScreenCTM();
      if (!matrix) return { x: 0, y: 0 };
      const local = point.matrixTransform(matrix.inverse());
      return { x: (local.x - view.x) / view.k, y: (local.y - view.y) / view.k };
    },
    [view],
  );

  const nodeAt = useCallback(
    (x: number, y: number): GNode | null => {
      let best: GNode | null = null;
      let bestDistance = 34;
      for (const node of nodes ?? []) {
        const distance = Math.hypot(node.x - x, node.y - y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = node;
        }
      }
      return best;
    },
    [nodes],
  );

  const saveLinks = useCallback(
    (nextEdges: GEdge[], nextNodes: GNode[]) => {
      const links: RawLinks = {};
      const ensure = (slug: string) => {
        links[slug] ??= { prerequisites: [], next: [], related: [] };
        return links[slug];
      };
      for (const edge of nextEdges) {
        if (edge.kind === 'solid') {
          ensure(edge.from).next.push(edge.to);
        } else {
          ensure(edge.from).related.push(edge.to);
        }
      }
      for (const entry of Object.values(links)) {
        entry.next = [...new Set(entry.next)];
        entry.related = [...new Set(entry.related)];
      }
      const ordered: RawLinks = {};
      for (const node of nextNodes) {
        if (links[node.slug]) ordered[node.slug] = links[node.slug];
      }
      updateFile(LINKS_PATH, `${JSON.stringify({ links: ordered }, null, 2)}\n`);
    },
    [updateFile],
  );

  const positions = useCallback((nextNodes: GNode[]) => {
    const map: Record<string, { x: number; y: number }> = {};
    for (const node of nextNodes) map[node.slug] = { x: node.x, y: node.y };
    localStorage.setItem(POS_KEY, JSON.stringify(map));
  }, []);

  const hasSolidPath = useCallback(
    (from: string, to: string, edgeList: GEdge[]) => {
      const stack = [from];
      const seen = new Set<string>();
      while (stack.length) {
        const current = stack.pop() as string;
        if (current === to) return true;
        if (seen.has(current)) continue;
        seen.add(current);
        for (const edge of edgeList) {
          if (edge.kind === 'solid' && edge.from === current) stack.push(edge.to);
        }
      }
      return false;
    },
    [],
  );

  const applyEdges = (next: GEdge[]) => {
    setEdges(next);
    if (nodes) saveLinks(next, nodes);
  };

  const addEdge = (from: string, to: string, kind: EdgeKind) => {
    if (from === to) return;
    if (edges.some((edge) => edge.from === from && edge.to === to && edge.kind === kind)) return;
    if (edges.some((edge) => edge.from === to && edge.to === from && edge.kind === kind)) return;
    if (kind === 'solid' && hasSolidPath(to, from, edges)) {
      toast.show('这条实线会让章节依赖成环，已取消', 'error');
      return;
    }
    const next = [
      ...edges,
      { id: kind === 'solid' ? `${from}->${to}` : [from, to].sort().join('~'), from, to, kind },
    ];
    applyEdges(next);
    if (nodes) setNodes(withDegrees(nodes, next));
    toast.show(kind === 'solid' ? '已添加实线（先修 → 后续）' : '已添加虚线（相关）');
  };

  const removeEdge = (id: string) => {
    const next = edges.filter((edge) => edge.id !== id);
    applyEdges(next);
    if (nodes) setNodes(withDegrees(nodes, next));
    setSelectedEdge(null);
    toast.show('连线已移除');
  };

  const autoLayout = () => {
    if (!nodes) return;
    const layout = withDegrees(
      forceLayout(
        nodes.map((node) => ({ ...node, x: 550, y: 320 })),
        edges,
      ),
      edges,
    );
    setNodes(layout);
    setView({ x: 0, y: 0, k: 1 });
    positions(layout);
    toast.show('已重新排布节点');
  };

  const onBackgroundPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    setSelectedEdge(null);
    setPan({ x: event.clientX, y: event.clientY, ox: view.x, oy: view.y });
    (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = toGraph(event.clientX, event.clientY);
    if (dragNode) {
      setNodes(
        (prev) =>
          prev?.map((node) =>
            node.slug === dragNode.slug ? { ...node, x: point.x + dragNode.dx, y: point.y + dragNode.dy } : node,
          ) ?? prev,
      );
      return;
    }
    if (connect) {
      setConnect({ ...connect, x: point.x, y: point.y });
      return;
    }
    if (detach) {
      setDetach({ ...detach, x: point.x, y: point.y });
      return;
    }
    if (pan) {
      setView({ x: pan.ox + (event.clientX - pan.x), y: pan.oy + (event.clientY - pan.y), k: view.k });
    }
  };

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = toGraph(event.clientX, event.clientY);
    if (dragNode) {
      setDragNode(null);
      if (nodes) positions(nodes);
    }
    if (connect) {
      const target = nodeAt(point.x, point.y);
      if (target && target.slug !== connect.from) addEdge(connect.from, target.slug, connect.kind);
      setConnect(null);
    }
    if (detach) {
      const edge = edges.find((item) => item.id === detach.id);
      if (edge) {
        const endNode = nodeMap.get(detach.end === 'from' ? edge.from : edge.to);
        const distance = endNode ? Math.hypot(endNode.x - point.x, endNode.y - point.y) : 0;
        if (distance > 46) removeEdge(detach.id);
      }
      setDetach(null);
    }
    setPan(null);
  };

  const zoom = (delta: number, centerX?: number, centerY?: number) => {
    const k = Math.max(0.35, Math.min(2.6, view.k * delta));
    const cx = centerX ?? size.w / 2;
    const cy = centerY ?? size.h / 2;
    setView({
      k,
      x: cx - ((cx - view.x) * k) / view.k,
      y: cy - ((cy - view.y) * k) / view.k,
    });
  };

  const fit = () => {
    if (!nodes || nodes.length === 0) return;
    const xs = nodes.map((node) => node.x);
    const ys = nodes.map((node) => node.y);
    const minX = Math.min(...xs) - 60;
    const maxX = Math.max(...xs) + 60;
    const minY = Math.min(...ys) - 40;
    const maxY = Math.max(...ys) + 50;
    const k = Math.min(2, Math.min(size.w / (maxX - minX), size.h / (maxY - minY)));
    setView({
      k,
      x: (size.w - (maxX - minX) * k) / 2 - minX * k,
      y: (size.h - (maxY - minY) * k) / 2 - minY * k,
    });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedEdge) {
        removeEdge(selectedEdge);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const edgePath = (edge: GEdge) => {
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    if (!from || !to) return null;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const r1 = 8 + Math.sqrt(from.degree + 1) * 3;
    const r2 = 8 + Math.sqrt(to.degree + 1) * 3;
    const x1 = from.x + (dx / length) * (r1 + 3);
    const y1 = from.y + (dy / length) * (r1 + 3);
    const x2 = to.x - (dx / length) * (r2 + 6);
    const y2 = to.y - (dy / length) * (r2 + 6);
    return { x1, y1, x2, y2 };
  };

  if (!nodes) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'rgb(var(--ink-faint))' }}>
        正在准备图谱…
      </div>
    );
  }

  return (
    <div>
      <div className="section-head">
        <h2>{nodes.length} 个节点 · {edges.length} 条连线</h2>
        <span className="pill">
          <Icon name="spark" size={13} /> 所有笔记都会出现在图上
        </span>
        <div style={{ flex: 1 }} />
        <Button size="sm" icon="wand" onClick={autoLayout}>
          自动布局
        </Button>
        <Button size="sm" icon="refresh" onClick={fit}>
          适应画布
        </Button>
        <Button size="sm" icon="plus" onClick={() => zoom(1.2)}>
          放大
        </Button>
        <Button size="sm" onClick={() => zoom(0.83)}>
          缩小
        </Button>
      </div>

      <div className="graph-shell" ref={shellRef}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size.w} ${size.h}`}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget || (event.target as Element).tagName === 'rect') {
              onBackgroundPointerDown(event);
            }
          }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={(event) => {
            event.preventDefault();
            const rect = svgRef.current?.getBoundingClientRect();
            zoom(event.deltaY < 0 ? 1.08 : 0.92, event.clientX - (rect?.left ?? 0), event.clientY - (rect?.top ?? 0));
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(var(--accent))" />
            </marker>
            <marker id="arrow-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(var(--graph-line))" />
            </marker>
          </defs>
          <rect x={0} y={0} width={size.w} height={size.h} fill="transparent" />
          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            {edges.map((edge) => {
              const path = edgePath(edge);
              if (!path) return null;
              const isSelected = selectedEdge === edge.id;
              const stroke = isSelected ? 'rgb(var(--graph-line-highlight))' : 'rgb(var(--graph-line))';
              return (
                <g key={edge.id} className="graph-edge">
                  <line
                    x1={path.x1}
                    y1={path.y1}
                    x2={path.x2}
                    y2={path.y2}
                    stroke={stroke}
                    strokeWidth={isSelected ? 2.6 : 1.5}
                    strokeDasharray={edge.kind === 'dashed' ? '6 5' : undefined}
                    markerEnd={edge.kind === 'solid' ? (isSelected ? 'url(#arrow)' : 'url(#arrow-dim)') : undefined}
                    opacity={0.9}
                  />
                  <line
                    className="graph-edge-hit"
                    x1={path.x1}
                    y1={path.y1}
                    x2={path.x2}
                    y2={path.y2}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setSelectedEdge(edge.id);
                      setSelected(null);
                    }}
                  />
                </g>
              );
            })}

            {connect ? (
              (() => {
                const from = nodeMap.get(connect.from);
                if (!from) return null;
                return (
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={connect.x}
                    y2={connect.y}
                    stroke={connect.kind === 'solid' ? 'rgb(var(--accent))' : 'rgb(var(--iris))'}
                    strokeWidth={2}
                    strokeDasharray={connect.kind === 'dashed' ? '6 5' : undefined}
                  />
                );
              })()
            ) : null}

            {(nodes ?? []).map((node) => {
              const radius = 8 + Math.sqrt(node.degree + 1) * 3;
              const isSelected = selected === node.slug;
              return (
                <g key={node.slug} className="graph-node" data-slug={node.slug}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill={isSelected ? 'rgb(var(--graph-node-focused))' : 'rgb(var(--graph-node))'}
                    fillOpacity={node.degree === 0 ? 0.45 : 0.9}
                    stroke={isSelected ? 'rgb(var(--accent))' : 'rgb(var(--surface))'}
                    strokeWidth={2}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      const point = toGraph(event.clientX, event.clientY);
                      setSelected(node.slug);
                      setSelectedEdge(null);
                      setDragNode({ slug: node.slug, dx: node.x - point.x, dy: node.y - point.y });
                      (event.currentTarget as SVGCircleElement).setPointerCapture?.(event.pointerId);
                    }}
                    onDoubleClick={() => {
                      sessionStorage.setItem('r7kb-studio-note', notes.find((note) => note.slug === node.slug)?.path ?? '');
                      window.location.hash = '/notes';
                    }}
                  />
                  <circle
                    cx={node.x + radius + 7}
                    cy={node.y}
                    r={5}
                    fill="rgb(var(--surface))"
                    stroke="rgb(var(--accent))"
                    strokeWidth={1.6}
                    style={{ cursor: 'crosshair' }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setConnect({
                        from: node.slug,
                        kind: event.button === 2 ? 'dashed' : 'solid',
                        x: node.x,
                        y: node.y,
                      });
                      (event.currentTarget as SVGCircleElement).setPointerCapture?.(event.pointerId);
                    }}
                  />
                  <text
                    x={node.x}
                    y={node.y + radius + 15}
                    textAnchor="middle"
                    fontSize={12.5}
                    fill="rgb(var(--graph-text))"
                    opacity={isSelected ? 1 : 0.82}
                  >
                    {node.title.length > 14 ? `${node.title.slice(0, 14)}…` : node.title}
                  </text>
                </g>
              );
            })}

            {selectedEdge
              ? (() => {
                  const edge = edges.find((item) => item.id === selectedEdge);
                  if (!edge) return null;
                  const path = edgePath(edge);
                  if (!path) return null;
                  return (
                    <>
                      {(['from', 'to'] as const).map((end) => (
                        <circle
                          key={end}
                          cx={end === 'from' ? path.x1 : path.x2}
                          cy={end === 'from' ? path.y1 : path.y2}
                          r={detach?.id === edge.id && detach.end === end ? 8 : 5.5}
                          fill="rgb(var(--surface))"
                          stroke="rgb(var(--graph-line-highlight))"
                          strokeWidth={2}
                          style={{ cursor: 'grab' }}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            const point = toGraph(event.clientX, event.clientY);
                            setDetach({ id: edge.id, end, x: point.x, y: point.y });
                            (event.currentTarget as SVGCircleElement).setPointerCapture?.(event.pointerId);
                          }}
                        />
                      ))}
                      {detach?.id === edge.id ? (
                        <line
                          x1={detach.end === 'from' ? path.x2 : path.x1}
                          y1={detach.end === 'from' ? path.y2 : path.y1}
                          x2={detach.x}
                          y2={detach.y}
                          stroke="rgb(var(--rose))"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                        />
                      ) : null}
                    </>
                  );
                })()
              : null}
          </g>
        </svg>

        <div className="graph-toolbar">
          <span className="pill">
            <Icon name="link" size={13} /> 拖动节点右侧的小圆点连线
          </span>
          <span className="pill">左键实线 · 右键虚线</span>
          <span className="pill">点连线 → 拖端点外拉断开</span>
        </div>

        <div className="graph-legend">
          <span>
            <span className="legend-line" /> 实线：先修 → 后续
          </span>
          <span>
            <span className="legend-line" data-kind="dashed" /> 虚线：相关
          </span>
          {selected ? (
            <span style={{ color: 'rgb(var(--ink))' }}>
              已选：{nodeMap.get(selected)?.title}（双击打开笔记）
            </span>
          ) : null}
        </div>

        <div className="graph-tip">
          节点来自知识库所有笔记；没连线的笔记也会作为单独节点出现。连线保存在
          <code> chapter-links.json</code>，发布后站点图谱会同步更新。
        </div>
      </div>
    </div>
  );
}
