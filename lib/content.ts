import fs from 'node:fs';
import path from 'node:path';
import {
  parseFrontmatter,
  toConcept,
  toFaq,
  toQuestion,
  toResource,
  toSubject,
  type RawDoc,
} from './frontmatter';
import type { Concept, Faq, Question, Resource, Stats, Subject } from './types';

/**
 * 构建期内容加载器（仅服务端 / 静态导出时使用）。
 *
 * 内容目录：class-kb/content/
 *   graph/subjects/、graph/concepts/ 下的 Markdown
 *   quiz/、library/、faq/ 下的 Markdown
 *
 * 以下划线或点开头的文件/目录、以及 _README.md 不参与加载。
 * 客户端组件不要 import 本文件（含 node:fs）。
 */

const CONTENT_ROOT = path.join(process.cwd(), 'content');

const isHidden = (name: string) =>
  name.startsWith('_') || name.startsWith('.') || name === 'README.md';

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (isHidden(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      out.push(full);
    }
  }
  return out.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
}

function toRelative(filePath: string): string {
  return path.relative(CONTENT_ROOT, filePath).split(path.sep).join('/');
}

function loadDocs(dir: string): RawDoc[] {
  return walkFiles(dir).map((filePath) => {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, body } = parseFrontmatter(raw);
    return { data, body, filePath, relPath: toRelative(filePath) };
  });
}

/** 目录名（基础/进阶/拓展）→ 图谱层级 */
function levelFromPath(relPath: string): 1 | 2 | 3 {
  if (/基础|入门|基本|初级/.test(relPath)) return 1;
  if (/进阶|提高|中级/.test(relPath)) return 2;
  if (/拓展|高级|扩展/.test(relPath)) return 3;
  return 1;
}

function fallbackId(relPath: string): string {
  return relPath
    .replace(/^[^/]+\//, '')
    .replace(/^.*?\/(subjects|concepts)\//, '')
    .replace(/\.md$/i, '')
    .replace(/\//g, '-');
}

/* ------------------------------------------------------------------ */
/* 加载 + 进程内缓存（构建期重复调用只读一次盘）                      */
/* ------------------------------------------------------------------ */

const cache = new Map<string, unknown>();

function cached<T>(key: string, factory: () => T): T {
  if (cache.has(key)) return cache.get(key) as T;
  const value = factory();
  cache.set(key, value);
  return value;
}

export function getSubjects(): Subject[] {
  return cached('subjects', () =>
    loadDocs(path.join(CONTENT_ROOT, 'graph', 'subjects')).map((doc) =>
      toSubject(doc, fallbackId(doc.relPath))
    )
  );
}

export function getConcepts(): Concept[] {
  return cached('concepts', () =>
    loadDocs(path.join(CONTENT_ROOT, 'graph', 'concepts')).map((doc) => {
      const concept = toConcept(doc, fallbackId(doc.relPath));
      const explicit = doc.data.level;
      return {
        ...concept,
        level: explicit === undefined ? levelFromPath(doc.relPath) : concept.level,
      };
    })
  );
}

export function getQuestions(): Question[] {
  return cached('questions', () =>
    loadDocs(path.join(CONTENT_ROOT, 'quiz')).map((doc) => {
      const options = Array.isArray(doc.data.options)
        ? (doc.data.options as string[]).map(String)
        : [];
      return toQuestion(doc, fallbackId(doc.relPath), options);
    })
  );
}

export function getResources(): Resource[] {
  return cached('resources', () =>
    loadDocs(path.join(CONTENT_ROOT, 'library')).map((doc) =>
      toResource(doc, fallbackId(doc.relPath))
    )
  );
}

export function getFaqs(): Faq[] {
  return cached('faqs', () =>
    loadDocs(path.join(CONTENT_ROOT, 'faq')).map((doc) => toFaq(doc, fallbackId(doc.relPath)))
  );
}

export function getStats(): Stats {
  const questions = getQuestions();
  return {
    concepts: getConcepts().length,
    subjects: getSubjects().length,
    questions: questions.length,
    wrong: questions.filter((q) => q.mastered === false).length,
    resources: getResources().length,
    faqs: getFaqs().length,
  };
}
