import Link from 'next/link';
import StatusMark from '@/components/reactbits-micro/StatusMark';
import Icon from '@/components/site/Icon';
import { mainNav } from '@/data/site';

export default function NotFound() {
  return (
    <section className="relative flex min-h-[80vh] items-center overflow-hidden pt-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 mesh-soft opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]"
      />

      <div className="container-page">
        <div className="mx-auto max-w-xl text-center">
          <p className="eyebrow">404 · NOT FOUND</p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <StatusMark status="failed" color="#86868b" errorColor="#86868b" size={26} strike={false} />
            <p className="text-[24px] font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">
              这个知识点还没有入库
            </p>
          </div>

          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-ink-muted">
            页面可能被移动了，也可能内容还没录进来。回到首页，或者从下面几个入口重新出发。
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="pill px-3.5 py-2 text-[13px] transition-colors duration-200 ease-apple hover:border-accent/30 hover:bg-surface hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <Link href="/" className="btn btn-primary mt-8">
            回到首页
            <Icon name="arrow" size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}