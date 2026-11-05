/**
 * 共享内容类型（服务端加载器与客户端组件共用）。
 * 这些类型只描述数据形状，不含任何 `node:` 依赖，客户端可安全 import。
 */

export type Subject = {
  id: string;
  name: string;
  /** 十六进制色值或 CSS 变量，用于图谱节点与标签着色 */
  color: string;
};

export type Concept = {
  id: string;
  /** 概念名，节点上显示的文字 */
  label: string;
  subjectId: string;
  /** 一句话定义 */
  summary?: string;
  /** 前置概念 id；图谱据此连线，且必须无环 */
  prerequisites?: string[];
  /** 1=基础 2=进阶 3=拓展 */
  level?: 1 | 2 | 3;
  tags?: string[];
};

export type Question = {
  id: string;
  subjectId: string;
  /** 题干 */
  stem: string;
  /** 选项，判断/填空/解答题可省略 */
  options?: string[];
  /** 参考答案 */
  answer?: string;
  /** 解析 */
  explanation?: string;
  difficulty?: 1 | 2 | 3;
  /** 关联概念 id，便于从图谱跳到题目 */
  conceptId?: string;
  /** 是否已掌握；false 的题会出现在错题本 */
  mastered?: boolean;
  /** 来源，如「10 月月考 第 12 题」 */
  source?: string;
  tags?: string[];
};

export type ResourceType = 'pdf' | 'slide' | 'doc' | 'video' | 'link';

export type Resource = {
  id: string;
  title: string;
  /** 学科 id，可留空表示公共资料 */
  subjectId?: string;
  type: ResourceType;
  /** 文件地址：放在 public/resources/ 下就写 /resources/xxx.pdf */
  href: string;
  /** 展示用的大小，如「2.4 MB」 */
  size?: string;
  /** ISO 日期，如 2026-03-01 */
  updatedAt?: string;
  description?: string;
  tags?: string[];
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  /** 分类标签，如「作业」「考试」 */
  category?: string;
};

export type Stats = {
  concepts: number;
  subjects: number;
  questions: number;
  wrong: number;
  resources: number;
  faqs: number;
};

/** 资料类型的中文名与图标 key */
export const resourceTypeLabel: Record<ResourceType, string> = {
  pdf: 'PDF',
  slide: '课件',
  doc: '文档',
  video: '视频',
  link: '链接',
};
/** 学科 id -> 学科对象；找不到时返回 undefined */
export function subjectOf(subjects: Subject[], subjectId?: string): Subject | undefined {
  if (!subjectId) return undefined;
  return subjects.find((s) => s.id === subjectId);
}
