'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Icon from '@/components/site/Icon';

export type BranchedSection = {
  id: string;
  label: string;
  href?: string;
  children: { label: string; href: string }[];
};

type BranchedMenuProps = {
  sections: BranchedSection[];
  className?: string;
  /** 行高，默认 30 */
  rowHeight?: number;
  /** 子项起始缩进，默认 34 */
  indent?: number;
  /** 树干位置，默认 12 */
  trunk?: number;
};

const normalize = (path: string) => (path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path);

/** 一节里某一行：树干 → 半高 → 圆角拐弯 → 连到标签 */
function BranchLine({
  index,
  rowHeight,
  indent,
  trunk,
  active,
}: {
  index: number;
  rowHeight: number;
  indent: number;
  trunk: number;
  active: boolean;
}) {
  const mid = rowHeight / 2;
  const radius = Math.min(10, mid - 2);
  const endX = indent - 6;
  const d = `M ${trunk} 0 V ${mid - radius} Q ${trunk} ${mid} ${trunk + radius} ${mid} H ${endX}`;

  return (
    <svg
      aria-hidden
      className="bm-branch"
      width={indent}
      height={rowHeight}
      viewBox={`0 0 ${indent} ${rowHeight}`}
      style={{ opacity: active ? 1 : 0.9 }}
    >
      <path
        d={d}
        pathLength={1}
        fill="none"
        strokeWidth={1.4}
        strokeLinecap="round"
        style={{ stroke: active ? 'rgb(var(--accent))' : 'rgb(var(--ink) / 0.2)' }}
      />
      {active ? (
        <>
          <path
            className="bm-branch-draw"
            d={d}
            pathLength={1}
            fill="none"
            strokeWidth={1.6}
            strokeLinecap="round"
            style={{ stroke: 'rgb(var(--accent))' }}
          />
          <circle cx={endX} cy={mid} r={2.2} style={{ fill: 'rgb(var(--accent))' }} />
        </>
      ) : null}
      <title>{`branch ${index + 1}`}</title>
    </svg>
  );
}

/** ReactBits BranchedMenu 的无依赖移植：章节折叠，子项由树干分支连出 */
export function BranchedMenu({
  sections,
  className = '',
  rowHeight = 30,
  indent = 34,
  trunk = 12,
}: BranchedMenuProps) {
  const pathname = usePathname();
  const activePath = normalize(pathname ?? '');

  const activeSection = useMemo(() => {
    const index = sections.findIndex((section) =>
      section.children.some((child) => normalize(child.href) === activePath),
    );
    return index;
  }, [sections, activePath]);

  const [open, setOpen] = useState<number[]>(() => (activeSection >= 0 ? [activeSection] : [0]));

  // 切换到别的章节时，自动展开当前笔记所在章节
  useEffect(() => {
    if (activeSection < 0) return;
    setOpen((prev) => (prev.includes(activeSection) ? prev : [...prev, activeSection]));
  }, [activeSection]);

  const toggle = (index: number) => {
    setOpen((prev) => (prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]));
  };

  const cssVars = {
    '--bm-row': `${rowHeight}px`,
    '--bm-indent': `${indent}px`,
    '--bm-trunk': `${trunk}px`,
  } as CSSProperties;

  return (
    <nav className={`bm ${className}`} style={cssVars} aria-label="知识库目录">
      {sections.map((section, index) => {
        const isOpen = open.includes(index);
        const isLeaf = section.children.length === 0;
        const sectionActive = activeSection === index;

        if (isLeaf) {
          const active = section.href ? normalize(section.href) === activePath : false;
          return (
            <Link
              key={section.id}
              href={section.href ?? '#'}
              className={`bm-row flex items-center gap-2 rounded-lg px-2 text-[13px] ${
                active ? 'bg-accent-soft font-medium text-accent' : 'text-ink-muted hover:bg-ink/[0.04] hover:text-ink'
              }`}
            >
              <Icon name="book" size={13} className="shrink-0 opacity-70" />
              {section.label}
            </Link>
          );
        }

        return (
          <div key={section.id} className="bm-section">
            <div
              className={`bm-row flex items-center gap-1 rounded-lg pr-1.5 ${
                sectionActive ? 'text-accent' : 'text-ink'
              }`}
            >
              {section.href ? (
                <Link
                  href={section.href}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-semibold hover:bg-ink/[0.04]"
                  aria-current={normalize(section.href) === activePath ? 'page' : undefined}
                >
                  <Icon name="book" size={13} className="shrink-0 opacity-70" />
                  <span className="truncate">{section.label}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] font-semibold hover:bg-ink/[0.04]"
                  aria-expanded={isOpen}
                >
                  <Icon name="book" size={13} className="shrink-0 opacity-70" />
                  <span className="truncate">{section.label}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => toggle(index)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:text-ink"
                aria-label={isOpen ? `收起 ${section.label}` : `展开 ${section.label}`}
                aria-expanded={isOpen}
              >
                <Icon
                  name="chevronDown"
                  size={12}
                  className="bm-caret transition-transform duration-300"
                  style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                />
              </button>
            </div>

            <div className="bm-trunk-stub" aria-hidden />

            <div className="bm-fold" data-open={isOpen}>
              <div>
                {section.children.map((child, childIndex) => {
                  const active = normalize(child.href) === activePath;
                  return (
                    <div key={child.href} className="relative flex items-center" style={{ height: rowHeight }}>
                      <BranchLine
                        index={childIndex}
                        rowHeight={rowHeight}
                        indent={indent}
                        trunk={trunk}
                        active={active}
                      />
                      <Link
                        href={child.href}
                        className={`bm-row flex min-w-0 flex-1 items-center gap-1.5 rounded-lg py-1 text-[12.5px] leading-snug ${
                          active
                            ? 'bg-accent-soft font-medium text-accent'
                            : 'text-ink-muted hover:bg-ink/[0.04] hover:text-ink'
                        }`}
                        style={{ paddingLeft: indent + 2, paddingRight: 6 }}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className="truncate">{child.label}</span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export default BranchedMenu;
