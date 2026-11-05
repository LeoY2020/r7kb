import type { Concept, Subject } from '@/lib/types';

type GraphCanvasProps = {
  concepts: Concept[];
  subjects: Subject[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  levelFilter?: number | null;
};

const NODE_W = 148;
const NODE_H = 46;
const COL_GAP = 250;
const PAD_X = 130;
const PAD_Y = 90;

const levelColor: Record<number, string> = {
  1: '#0071e3',
  2: '#5e5ce6',
  3: '#30b0c7',
};

type Placed = { concept: Concept; x: number; y: number; color: string };

/**
 * 纯 SVG 的学习图谱画布：不依赖 vis-network 等图形库，
 * 静态导出时也能直接渲染。概念按 level 分列，前置关系画成箭头。
 */
export function GraphCanvas({
  concepts,
  subjects,
  selectedId,
  onSelect,
  levelFilter = null,
}: GraphCanvasProps) {
  const visible = concepts.filter((c) => (levelFilter ? c.level === levelFilter : true));

  const byLevel = new Map<number, Concept[]>();
  for (const c of visible) {
    const lv = c.level ?? 1;
    const arr = byLevel.get(lv) ?? [];
    arr.push(c);
    byLevel.set(lv, arr);
  }

  const levelKeys = Array.from(byLevel.keys()).sort((a, b) => a - b);
  const maxRows = Math.max(1, ...Array.from(byLevel.values()).map((v) => v.length));

  const height = Math.max(460, PAD_Y * 2 + (maxRows - 1) * 92);
  const width = PAD_X * 2 + Math.max(1, levelKeys.length - 1) * COL_GAP;

  const placed: Placed[] = [];
  levelKeys.forEach((lv, col) => {
    const arr = byLevel.get(lv) ?? [];
    arr.forEach((c, row) => {
      const step = height / (arr.length + 1);
      const x = levelKeys.length === 1 ? width / 2 : PAD_X + col * COL_GAP;
      const y = arr.length === 1 ? height / 2 : step * (row + 1);
      const subjectColor = subjects.find((s) => s.id === c.subjectId)?.color;
      placed.push({ concept: c, x, y, color: subjectColor ?? levelColor[lv] ?? '#0071e3' });
    });
  });

  const posById = new Map(placed.map((p) => [p.concept.id, p]));

  if (visible.length === 0) {
    return <GhostGraph />;
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="学习图谱：概念与前置关系"
    >
      <defs>
        <marker
          id="graph-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(0,0,0,0.18)" />
        </marker>
      </defs>

      {levelKeys.map((lv, col) => (
        <text
          key={`lv-${lv}`}
          x={levelKeys.length === 1 ? width / 2 : PAD_X + col * COL_GAP}
          y={34}
          textAnchor="middle"
          className="font-mono"
          fill="#86868b"
          style={{ fontSize: 11, letterSpacing: '0.22em' }}
        >
          {lv === 1 ? 'BASIC' : lv === 2 ? 'ADVANCED' : 'EXTENDED'}
        </text>
      ))}

      {placed.map((p) =>
        (p.concept.prerequisites ?? []).map((preId) => {
          const from = posById.get(preId);
          if (!from) return null;
          const x1 = from.x + NODE_W / 2;
          const y1 = from.y;
          const x2 = p.x - NODE_W / 2;
          const y2 = p.y;
          const mid = (x1 + x2) / 2;

          return (
            <path
              key={`${preId}-${p.concept.id}`}
              d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke="rgba(0,0,0,0.18)"
              strokeWidth={1.2}
              markerEnd="url(#graph-arrow)"
            />
          );
        })
      )}

      {placed.map((p) => {
        const selected = selectedId === p.concept.id;

        return (
          <g
            key={p.concept.id}
            onClick={() => onSelect?.(p.concept.id)}
            className={onSelect ? 'cursor-pointer' : undefined}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onKeyDown={(e) => {
              if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelect(p.concept.id);
              }
            }}
          >
            <rect
              x={p.x - NODE_W / 2}
              y={p.y - NODE_H / 2}
              width={NODE_W}
              height={NODE_H}
              rx={12}
              fill={selected ? '#f5f9ff' : '#ffffff'}
              stroke={selected ? '#0071e3' : 'rgba(0,0,0,0.12)'}
              strokeWidth={selected ? 1.8 : 1}
            />
            <circle cx={p.x - NODE_W / 2 + 14} cy={p.y} r={3.5} fill={p.color} />
            <text
              x={p.x + 8}
              y={p.y + 4}
              textAnchor="middle"
              fill="#1d1d1f"
              style={{ fontSize: 12.5 }}
            >
              {p.concept.label.length > 12
                ? `${p.concept.label.slice(0, 12)}…`
                : p.concept.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** 没有概念时的“幽灵图谱”：让空页面也能看出这里将来长什么样 */
function GhostGraph() {
  const ghosts = [
    { x: 20, y: 46, label: '前置概念' },
    { x: 20, y: 74, label: '前置概念' },
    { x: 50, y: 34, label: '当前概念' },
    { x: 50, y: 62, label: '当前概念' },
    { x: 80, y: 46, label: '拓展概念' },
  ];

  return (
    <svg viewBox="0 0 100 100" className="h-auto w-full" role="img" aria-label="图谱占位">
      <defs>
        <linearGradient id="ghost-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,0,0,0.04)" />
          <stop offset="50%" stopColor="rgba(0,0,0,0.18)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.04)" />
        </linearGradient>
      </defs>

      {[
        [26, 44, 42, 36],
        [26, 74, 42, 62],
        [58, 34, 72, 44],
        [58, 62, 72, 46],
      ].map(([x1, y1, x2, y2], i) => (
        <path
          key={i}
          d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
          stroke="url(#ghost-line)"
          strokeWidth="0.5"
          strokeDasharray="2 2"
          fill="none"
        />
      ))}

      {ghosts.map((g, i) => (
        <g key={i} opacity={0.55}>
          <rect
            x={g.x - 9}
            y={g.y - 4}
            width="18"
            height="8"
            rx="2.5"
            fill="#ffffff"
            stroke="rgba(0,0,0,0.12)"
            strokeDasharray="3 2"
            strokeWidth="0.5"
          />
          <text
            x={g.x}
            y={g.y + 1.4}
            textAnchor="middle"
            fill="#86868b"
            style={{ fontSize: 3 }}
          >
            {g.label}
          </text>
        </g>
      ))}

      <text
        x="50"
        y="90"
        textAnchor="middle"
        fill="#86868b"
        style={{ fontSize: 3, letterSpacing: '0.4px' }}
      >
        概念入库后，这里会自动连成一张有向图
      </text>
    </svg>
  );
}

export default GraphCanvas;
