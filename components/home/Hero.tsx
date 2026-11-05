import Link from 'next/link';
import Particles from '@/components/reactbits/Particles';
import ShinyText from '@/components/reactbits/ShinyText';
import RotatingText from '@/components/reactbits/RotatingText';
import CountUp from '@/components/reactbits/CountUp';
import Icon from '@/components/site/Icon';
import { site, modules } from '@/data/site';
import { getStats } from '@/lib/content';

const rotatingTexts = ['学习图谱', '智能电子书', '错题本', '资料库', '常见问题'];

export function Hero() {
  const stats = getStats();
  const statItems = [
    { label: '概念', value: stats.concepts },
    { label: '题目', value: stats.questions },
    { label: '资料', value: stats.resources },
    { label: '问答', value: stats.faqs },
  ];

  return (
    <section className="relative overflow-hidden pt-36 sm:pt-44">
      {/* 极淡的粒子：只给首屏一点空气感 */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Particles
          particleColors={['#0071e3', '#5e5ce6', '#c7c7cc']}
          particleCount={80}
          particleSpread={14}
          speed={0.04}
          particleBaseSize={70}
          sizeRandomness={1.4}
          alphaParticles
          lightMode
          disableRotation
          className="opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_72%)]"
        />
      </div>

      <div className="container-page text-center">
        <span className="pill mx-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <ShinyText
            text={`${site.latinName} · ${site.name}`}
            speed={6}
            color="var(--ink-faint)"
            shineColor="var(--accent)"
            className="text-[12px] tracking-[0.12em]"
          />
        </span>

        <h1 className="display mx-auto mt-8 max-w-3xl">
          把一学期的知识
          <br className="hidden sm:block" />
          整理成一张可以走的地图。
        </h1>

        <p className="lede mx-auto mt-6 flex max-w-xl flex-wrap items-baseline justify-center gap-x-1.5">
          这里收着
          <RotatingText
            texts={rotatingTexts}
            rotationInterval={2600}
            staggerDuration={0.02}
            staggerFrom="last"
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-110%', opacity: 0 }}
            mainClassName="font-medium text-accent"
            splitLevelClassName="overflow-hidden"
          />
          ，不是零散文件，而是一张互相连着的网。
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/graph/" className="btn-primary">
            从学习图谱开始
            <Icon name="arrow" size={16} />
          </Link>
          <Link href="/knowledge/" className="btn-secondary">
            打开知识库
          </Link>
        </div>
      </div>

      {/* 产品展示式面板：Apple 习惯把“界面本身”当作首屏视觉 */}
      <div className="container-page mt-16 sm:mt-20">
        <div className="card overflow-hidden rounded-panel p-2 sm:p-3">
          <div className="relative overflow-hidden rounded-[20px] border border-line bg-gradient-to-b from-elevated to-surface">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-accent-soft/60 to-transparent" />

            {/* 计数行 */}
            <div className="relative grid grid-cols-2 divide-y divide-line sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
              {statItems.map((item) => (
                <div key={item.label} className="px-6 py-6 text-left">
                  <p className="text-[28px] font-semibold tracking-tight text-ink">
                    <CountUp to={item.value} from={0} duration={1.4} startWhen />
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-faint">{item.label}</p>
                </div>
              ))}
            </div>

            {/* 六个入口预览 */}
            <div className="relative grid gap-2 border-t border-line p-2 sm:grid-cols-2 sm:p-3">
              {modules.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className="group flex items-center gap-4 rounded-[16px] px-4 py-4 transition-colors duration-200 ease-apple hover:bg-page"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border border-line bg-surface text-accent">
                    <Icon name={m.icon} size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-ink">{m.title}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-ink-faint">{m.hint}</span>
                  </span>
                  <Icon
                    name="arrow"
                    size={15}
                    className="text-ink-faint transition-transform duration-200 ease-apple group-hover:translate-x-0.5 group-hover:text-accent"
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[12px] text-ink-faint">
          内容目录：<span className="font-mono">content/</span> · 知识库是 Obsidian vault
        </p>
      </div>
    </section>
  );
}

export default Hero;
