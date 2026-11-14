/**
 * 学习图谱设置（对齐 Obsidian 全局关系图的可调项）。
 *
 * 数值与 Obsidian 的存储方式保持一致：
 * - centerStrength / linkStrength 存的是滑块的 0~1 位置，渲染前用 valueOfSlider 还原；
 * - repelStrength 存 0~20 的滑块值，力 = -value³；
 * - linkDistance 直接存 30~500 的像素值。
 */

export type GraphColorGroup = {
  query: string;
  color: string;
};

export type GraphSettings = {
  search: string;
  showTags: boolean;
  showAttachments: boolean;
  hideUnresolved: boolean;
  showOrphans: boolean;
  colorGroups: GraphColorGroup[];
  showArrow: boolean;
  textFadeMultiplier: number;
  nodeSizeMultiplier: number;
  lineSizeMultiplier: number;
  centerStrength: number;
  repelStrength: number;
  linkStrength: number;
  linkDistance: number;
};

/** Obsidian 的滑块 → 值映射（t 为指数底） */
export function valueOfSlider(slider: number, t: number): number {
  return (Math.pow(t, 1 - slider) - t) / (1 - t);
}

/** 观测值 → 滑块位置 */
export function sliderOfValue(value: number, t: number): number {
  return 1 - Math.log(value * (1 - t) + t) / Math.log(t);
}

export const DEFAULT_GRAPH_SETTINGS: GraphSettings = {
  search: '',
  showTags: false,
  showAttachments: false,
  hideUnresolved: false,
  showOrphans: true,
  colorGroups: [],
  showArrow: false,
  textFadeMultiplier: 0,
  nodeSizeMultiplier: 1,
  lineSizeMultiplier: 1,
  centerStrength: sliderOfValue(0.1, 0.01),
  repelStrength: 10,
  linkStrength: sliderOfValue(1, 0.01),
  linkDistance: 250,
};

const STORAGE_KEY = 'class-kb:graph-settings';

export function loadGraphSettings(): GraphSettings {
  if (typeof window === 'undefined') return DEFAULT_GRAPH_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_GRAPH_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GraphSettings>;
    return {
      ...DEFAULT_GRAPH_SETTINGS,
      ...parsed,
      colorGroups: Array.isArray(parsed.colorGroups)
        ? parsed.colorGroups
            .filter((g) => g && typeof g.query === 'string' && typeof g.color === 'string')
            .map((g) => ({ query: g.query, color: g.color }))
        : DEFAULT_GRAPH_SETTINGS.colorGroups,
    };
  } catch {
    return DEFAULT_GRAPH_SETTINGS;
  }
}

export function saveGraphSettings(settings: GraphSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* 隐私模式下忽略 */
  }
}

/**
 * 解析 Obsidian 风格查询：
 * - `tag:xxx` 匹配标签
 * - `path:xxx` / `file:xxx` 匹配章节 slug
 * - 其它词匹配标题
 * 多个词之间是「且」。
 */
export function matchQuery(query: string, node: { label: string; path: string; tags: string[] }): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  return terms.every((term) => {
    if (term.startsWith('tag:')) {
      const value = term.slice(4);
      return node.tags.some((tag) => tag.toLowerCase() === value || tag.toLowerCase().startsWith(`${value}/`));
    }
    if (term.startsWith('path:') || term.startsWith('file:')) {
      const value = term.slice(term.indexOf(':') + 1);
      return node.path.toLowerCase().includes(value);
    }
    if (term.startsWith('-')) {
      const value = term.slice(1);
      return !`${node.label} ${node.path} ${node.tags.join(' ')}`.toLowerCase().includes(value);
    }
    return `${node.label} ${node.path} ${node.tags.join(' ')}`.toLowerCase().includes(term);
  });
}
