import type { ReactNode } from 'react';

type SectionHeadingProps = {
  /** 小号大写灰字，例如 ENTRANCES */
  eyebrow: string;
  title: ReactNode;
  description?: string;
  action?: ReactNode;
};

export function SectionHeading({ eyebrow, title, description, action }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-[60ch]">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="title mt-4">{title}</h2>
        {description ? <p className="lede mt-3 text-[15px]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default SectionHeading;
