'use client';

import { MistakesProvider } from '@/components/mistakes/MistakesProvider';
import ProblemBlock from '@/components/knowledge/ProblemBlock';
import type { MarkdownBlock } from '@/lib/markdown';

type NoteContentProps = {
  blocks: MarkdownBlock[];
  /** 笔记标题，作为题目来源 */
  source?: string;
  /** 笔记 slug，便于错题回链 */
  slug?: string;
  /** 是否包裹错题 Provider（默认 true） */
  withProvider?: boolean;
};

function Blocks({ blocks, source, slug }: { blocks: MarkdownBlock[]; source?: string; slug?: string }) {
  let problemIndex = 0;

  return (
    <div className="note-prose">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading': {
            const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
            if (block.level === 1) {
              return (
                <h1 key={index} id={block.id} className="text-[clamp(1.7rem,3.1vw,2.4rem)] font-semibold tracking-tight">
                  <span dangerouslySetInnerHTML={{ __html: block.html }} />
                </h1>
              );
            }
            return (
              <Tag key={index} id={block.id}>
                <span dangerouslySetInnerHTML={{ __html: block.html }} />
              </Tag>
            );
          }
          case 'paragraph':
            return <p key={index} dangerouslySetInnerHTML={{ __html: block.html }} />;
          case 'list':
            return <div key={index} dangerouslySetInnerHTML={{ __html: block.html }} />;
          case 'quote':
            return <div key={index} dangerouslySetInnerHTML={{ __html: block.html }} />;
          case 'table':
            return <div key={index} dangerouslySetInnerHTML={{ __html: block.html }} />;
          case 'code':
            return (
              <pre key={index}>
                <code>{block.code}</code>
              </pre>
            );
          case 'image':
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={index} src={block.src} alt={block.alt} loading="lazy" decoding="async" />
            );
          case 'hr':
            return <hr key={index} />;
          case 'problem': {
            problemIndex += 1;
            return (
              <ProblemBlock
                key={index}
                raw={block.raw}
                variant={block.variant}
                source={source}
                slug={slug}
                index={problemIndex}
              />
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}

/** 知识库正文：统一渲染 Markdown 块与题目块 */
export function NoteContent({ blocks, source, slug, withProvider = true }: NoteContentProps) {
  if (!withProvider) return <Blocks blocks={blocks} source={source} slug={slug} />;
  return (
    <MistakesProvider>
      <Blocks blocks={blocks} source={source} slug={slug} />
    </MistakesProvider>
  );
}

export default NoteContent;
