'use client';

import { useEffect, useState } from 'react';
import RubberSegment from '@/components/reactbits-micro/RubberSegment';
import SquishSwitch from '@/components/reactbits-micro/SquishSwitch';
import PulseHeart from '@/components/reactbits-micro/PulseHeart';
import SpringCheck from '@/components/reactbits-micro/SpringCheck';
import WarmTooltip from '@/components/reactbits-micro/WarmTooltip';
import StatusMark from '@/components/reactbits-micro/StatusMark';
import LatticeLoader from '@/components/reactbits-micro/LatticeLoader';

type DemoCardProps = {
  label: string;
  title: string;
  children: React.ReactNode;
  className?: string;
};

function DemoCard({ label, title, children, className = '' }: DemoCardProps) {
  return (
    <div className={`card card-hover flex flex-col p-5 ${className}`}>
      <p className="eyebrow">{label}</p>
      <p className="mt-1.5 text-[14px] font-medium text-ink">{title}</p>
      <div className="mt-4 flex min-h-[64px] flex-1 items-center justify-center rounded-[16px] border border-line bg-page/70 px-3 py-4">
        {children}
      </div>
    </div>
  );
}

export function MicroShowcase() {
  const [period, setPeriod] = useState('week');
  const [notify, setNotify] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(12);
  const [reviewed, setReviewed] = useState(false);
  const [runState, setRunState] = useState<'pending' | 'running' | 'done'>('pending');
  const [loaderState, setLoaderState] = useState<'working' | 'done'>('working');

  useEffect(() => {
    if (runState !== 'running') return;
    const t = setTimeout(() => setRunState('done'), 1600);
    return () => clearTimeout(t);
  }, [runState]);

  useEffect(() => {
    if (loaderState !== 'working') return;
    const t = setTimeout(() => setLoaderState('done'), 2400);
    return () => clearTimeout(t);
  }, [loaderState]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <DemoCard label="Segment" title="切周期：一周 / 一月 / 一学期">
        <RubberSegment
          items={[
            { value: 'week', label: '一周' },
            { value: 'month', label: '一月' },
            { value: 'term', label: '一学期' },
          ]}
          value={period}
          onChange={setPeriod}
          size="sm"
          trackColor="#f5f5f7"
          thumbColor="#ffffff"
          textColor="#6e6e73"
          activeTextColor="#1d1d1f"
          aria-label="选择时间周期"
        />
      </DemoCard>

      <DemoCard label="Switch" title="开关：显示解析">
        <SquishSwitch
          checked={notify}
          onChange={setNotify}
          label={notify ? '已开启' : '已关闭'}
          width={62}
          height={32}
          radius={16}
          trackColor="#e8e8ed"
          trackOnColor="#0071e3"
          thumbColor="#ffffff"
          thumbOnColor="#ffffff"
        />
      </DemoCard>

      <DemoCard label="Heart" title="收藏：点一下收进本子">
        <PulseHeart
          liked={liked}
          count={likeCount}
          showCount
          size={22}
          likedColor="#ff375f"
          idleColor="#86868b"
          pillColor="#ffffff"
          onChange={(next, count) => {
            setLiked(next);
            setLikeCount(count);
          }}
        />
      </DemoCard>

      <DemoCard label="Check" title="标记：这条已经复习过">
        <SpringCheck
          label={reviewed ? '已复习' : '标记为已复习'}
          checked={reviewed}
          onChange={setReviewed}
          strike="center"
          color="#0071e3"
          fontSize={13}
          boxSize={20}
        />
      </DemoCard>

      <DemoCard label="Tooltip" title="悬停：先给一句话提示">
        <WarmTooltip
          content="内容填满后，这里会显示概念的一句话定义。"
          side="top"
          surfaceColor="#ffffff"
          inkColor="#1d1d1f"
        >
          <span className="cursor-help rounded-pill border border-line bg-surface px-3.5 py-1.5 text-[12px] text-ink-muted">
            悬停我试试
          </span>
        </WarmTooltip>
      </DemoCard>

      <DemoCard label="Status" title="状态：等待 → 进行 → 完成">
        <div className="flex w-full flex-col items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setRunState((s) => (s === 'done' ? 'pending' : s === 'pending' ? 'running' : 'done'))
            }
            className="flex items-center gap-2 rounded-pill border border-line bg-surface px-3 py-1.5 text-[12px] text-ink-muted transition-colors hover:border-accent/40"
          >
            <StatusMark
              status={runState}
              size={16}
              color="#86868b"
              doneColor="#0071e3"
              strike={false}
            />
            {runState === 'pending' ? '点击开始' : runState === 'running' ? '进行中…' : '已完成'}
          </button>

          <button
            type="button"
            onClick={() => setLoaderState('working')}
            className="w-full rounded-[12px] border border-line bg-surface px-2 py-1.5"
            aria-label="重播加载动画"
          >
            <LatticeLoader
              status={loaderState}
              label="正在整理资料"
              doneLabel="整理完成"
              showTimer
              cellSize={4}
              gap={1.5}
              fontSize={10}
              color="#0071e3"
              doneColor="#0071e3"
            />
          </button>
        </div>
      </DemoCard>
    </div>
  );
}

export default MicroShowcase;
