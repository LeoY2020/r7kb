'use client';

import { useState } from 'react';
import Icon from './Icon';
import type { Faq } from '@/lib/types';

type AccordionProps = {
  items: Faq[];
  /** 分类名 -> 颜色，用作左侧小标签 */
  categoryColor?: Record<string, string>;
};

export function Accordion({ items, categoryColor }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-soft">
      {items.map((item) => {
        const open = openId === item.id;
        const dot = item.category ? categoryColor?.[item.category] ?? '#0071e3' : '#0071e3';

        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : item.id)}
              aria-expanded={open}
              className="group flex w-full items-start gap-4 px-5 py-5 text-left transition-colors duration-200 ease-apple hover:bg-ink/[0.04] sm:px-6"
            >
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full opacity-90"
                style={{ backgroundColor: dot }}
              />
              <span className="flex-1">
                {item.category ? (
                  <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
                    {item.category}
                  </span>
                ) : null}
                <span className="block text-[15px] font-medium text-ink">{item.question}</span>
              </span>
              <Icon
                name="chevronDown"
                size={16}
                className={`mt-1.5 shrink-0 transition-transform duration-300 ease-apple ${
                  open ? 'rotate-180 text-accent' : 'text-ink-faint'
                }`}
              />
            </button>

            <div
              className="grid transition-[grid-template-rows] duration-300 ease-apple"
              style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-6 pl-[38px] pr-12 text-[14px] leading-relaxed text-ink-muted sm:px-6 sm:pl-[42px]">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Accordion;
