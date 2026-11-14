'use client';

import type { GraphColorGroup, GraphSettings } from '@/lib/graph-settings';

type Props = {
  settings: GraphSettings;
  onChange: (patch: Partial<GraphSettings>) => void;
  onReset: () => void;
  onClose: () => void;
};

const GROUP_COLORS = ['#e0533d', '#e0a33d', '#3da35d', '#3d8ee0', '#8a5cf6', '#d94a8c'];

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between font-mono text-[11px] text-ink-muted">
        <span>{label}</span>
        <span className="text-ink-faint">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 h-1 w-full cursor-pointer appearance-none rounded-full bg-line accent-accent"
      />
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onChange(!checked);
        }
      }}
      className="flex cursor-pointer touch-manipulation items-start justify-between gap-3 py-1.5"
    >
      <span>
        <span className="block text-[13px] text-ink">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-faint">{description}</span>
      </span>
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
          checked ? 'border-accent bg-accent' : 'border-line bg-elevated'
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          }`}
        />
      </span>
    </div>
  );
}

export default function GraphSettingsPanel({ settings, onChange, onReset, onClose }: Props) {
  const updateGroup = (index: number, patch: Partial<GraphColorGroup>) => {
    const colorGroups = settings.colorGroups.map((group, i) => (i === index ? { ...group, ...patch } : group));
    onChange({ colorGroups });
  };

  return (
    <aside className="flex max-h-[560px] w-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-lift lg:w-[300px]">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-[14px] font-medium text-ink">图谱设置</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-pill border border-line px-2.5 py-1 font-mono text-[10px] text-ink-faint transition-colors hover:text-ink"
          >
            恢复默认
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭设置"
            className="text-[15px] leading-none text-ink-faint transition-colors hover:text-ink"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section>
          <p className="eyebrow">筛选</p>
          <input
            value={settings.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="搜索章节，支持 tag:xxx / path:xxx"
            className="mt-2 w-full rounded-lg border border-line bg-page px-2.5 py-1.5 text-[12px] text-ink outline-none placeholder:text-ink-faint focus:border-accent/50"
          />
          <div className="mt-1">
            <Toggle
              label="标签"
              description="把章节的标签也画成节点"
              checked={settings.showTags}
              onChange={(showTags) => onChange({ showTags })}
            />
            <Toggle
              label="附件"
              description="当前知识库没有附件，开启后暂无变化"
              checked={settings.showAttachments}
              onChange={(showAttachments) => onChange({ showAttachments })}
            />
            <Toggle
              label="仅显示已存在的文件"
              description="关闭后会显示未创建的链接（当前没有）"
              checked={settings.hideUnresolved}
              onChange={(hideUnresolved) => onChange({ hideUnresolved })}
            />
            <Toggle
              label="孤立节点"
              description="没有任何连线的章节也显示出来"
              checked={settings.showOrphans}
              onChange={(showOrphans) => onChange({ showOrphans })}
            />
          </div>
        </section>

        <section>
          <p className="eyebrow">分组</p>
          <div className="mt-2 space-y-2">
            {settings.colorGroups.map((group, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={group.color}
                  onChange={(event) => updateGroup(index, { color: event.target.value })}
                  className="h-6 w-6 shrink-0 cursor-pointer rounded border border-line bg-transparent p-0"
                  aria-label="分组颜色"
                />
                <input
                  value={group.query}
                  onChange={(event) => updateGroup(index, { query: event.target.value })}
                  placeholder="tag:xxx 或 path:xxx"
                  className="min-w-0 flex-1 rounded border border-line bg-page px-2 py-1 font-mono text-[11px] text-ink outline-none placeholder:text-ink-faint focus:border-accent/50"
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({ colorGroups: settings.colorGroups.filter((_, i) => i !== index) })
                  }
                  className="shrink-0 px-0.5 text-ink-faint transition-colors hover:text-ink"
                  aria-label="删除分组"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onChange({
                  colorGroups: [
                    ...settings.colorGroups,
                    { query: '', color: GROUP_COLORS[settings.colorGroups.length % GROUP_COLORS.length] },
                  ],
                })
              }
              className="w-full rounded-lg border border-dashed border-line py-1.5 text-[11px] text-ink-faint transition-colors hover:border-accent/40 hover:text-accent"
            >
              + 新建分组
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <p className="eyebrow">显示</p>
          <Toggle
            label="箭头"
            description="先修关系画成有向箭头"
            checked={settings.showArrow}
            onChange={(showArrow) => onChange({ showArrow })}
          />
          <Slider
            label="文字淡出阈值"
            value={settings.textFadeMultiplier}
            min={-3}
            max={3}
            step={0.1}
            display={settings.textFadeMultiplier.toFixed(1)}
            onChange={(textFadeMultiplier) => onChange({ textFadeMultiplier })}
          />
          <Slider
            label="节点大小"
            value={settings.nodeSizeMultiplier}
            min={0.1}
            max={5}
            step={0.1}
            display={settings.nodeSizeMultiplier.toFixed(1)}
            onChange={(nodeSizeMultiplier) => onChange({ nodeSizeMultiplier })}
          />
          <Slider
            label="连线粗细"
            value={settings.lineSizeMultiplier}
            min={0.1}
            max={5}
            step={0.1}
            display={settings.lineSizeMultiplier.toFixed(1)}
            onChange={(lineSizeMultiplier) => onChange({ lineSizeMultiplier })}
          />
        </section>

        <section className="space-y-3">
          <p className="eyebrow">力</p>
          <Slider
            label="向心力"
            value={settings.centerStrength}
            min={0}
            max={1}
            step={0.001}
            display={`${Math.round(settings.centerStrength * 100)}%`}
            onChange={(centerStrength) => onChange({ centerStrength })}
          />
          <Slider
            label="斥力"
            value={settings.repelStrength}
            min={0}
            max={20}
            step={0.1}
            display={settings.repelStrength.toFixed(1)}
            onChange={(repelStrength) => onChange({ repelStrength })}
          />
          <Slider
            label="连线力"
            value={settings.linkStrength}
            min={0}
            max={1}
            step={0.001}
            display={`${Math.round(settings.linkStrength * 100)}%`}
            onChange={(linkStrength) => onChange({ linkStrength })}
          />
          <Slider
            label="连线长度"
            value={settings.linkDistance}
            min={30}
            max={500}
            step={1}
            display={`${Math.round(settings.linkDistance)}`}
            onChange={(linkDistance) => onChange({ linkDistance })}
          />
        </section>

        <p className="pb-1 font-mono text-[10px] leading-relaxed text-ink-faint">
          参数与 Obsidian 全局图谱一致，设置会保存在本机浏览器。
        </p>
      </div>
    </aside>
  );
}
