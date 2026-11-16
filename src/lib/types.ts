/** 共享类型（客户端）。 */

export type LoadedFile = { path: string; text: string; size: number };
export type ResourceFile = { path: string; size: number };

export type ContentSnapshot = {
  branch: string;
  baseBranch: string;
  workBranch: string;
  sha: string;
  repo: string;
  webRepo: string;
  files: LoadedFile[];
  resources: ResourceFile[];
  loadedAt: string;
};

export type FrontmatterValue = string | number | boolean | null | string[];
export type Frontmatter = Record<string, FrontmatterValue>;

export type Note = {
  path: string;
  dir: string;
  fileName: string;
  isIndex: boolean;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  order: number;
  chapter: string;
  updated: string;
  body: string;
  data: Frontmatter;
};

export type QuestionOption = { tag: string; text: string };
export type QuestionKind = 'single' | 'multiple' | 'judge' | 'blank' | 'text';

export type Question = {
  id: string;
  difficulty: 1 | 2 | 3;
  subject: string;
  stem: string;
  options: QuestionOption[];
  answer: string;
  explanation: string;
  knowledge: string[];
  kind: QuestionKind;
};

export type QuestionRecord = {
  notePath: string;
  index: number;
  question: Question;
  legacy: boolean;
};

export type LibraryItem = {
  id: string;
  title: string;
  subject?: string;
  type: 'pdf' | 'slide' | 'doc' | 'video' | 'link';
  href: string;
  /** 所在文件夹（相对 public/resources 的路径）；外部链接也可归入文件夹 */
  folder?: string;
  size?: string;
  updatedAt?: string;
  description?: string;
  tags?: string[];
};

export type PublishRun = {
  id: number;
  name: string;
  event: string;
  status: string;
  conclusion: string | null;
  branch: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
};

export type PublishStatus = {
  runs: PublishRun[];
  source: { sha: string; message: string; date: string; author: string; htmlUrl: string } | null;
  site: { sha: string; message: string; date: string; author: string; htmlUrl: string } | null;
  webRepo: string;
  sourceRepo: string;
  workBranch: string;
};

export const RESOURCE_TYPES: { id: LibraryItem['type']; label: string }[] = [
  { id: 'pdf', label: 'PDF' },
  { id: 'slide', label: '课件' },
  { id: 'doc', label: '文档' },
  { id: 'video', label: '视频' },
  { id: 'link', label: '链接' },
];
