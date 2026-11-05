/**
 * 站点基础信息。
 *
 * 目前班级信息留空（按需求「先留空」）。填好之后，页头、页脚、
 * 首页 hero 会立刻用上这些字段，无需改组件。
 */
export type SiteConfig = {
  /** 站点名，出现在导航与浏览器标签 */
  name: string;
  /** 英文标识，出现在页眉小字 */
  latinName: string;
  /** 学校名，可留空 */
  school: string;
  /** 年级，可留空 */
  grade: string;
  /** 班级名，可留空 */
  className: string;
  /** 一句话口号，留空则使用默认文案 */
  slogan: string;
  /** 建站时间 / 学期，可留空 */
  term: string;
  /** 维护人（学习委员 / 课代表等），可留空 */
  maintainer: string;
};

export const site: SiteConfig = {
  name: '班级知识库',
  latinName: 'CLASS KNOWLEDGE BASE',
  school: '',
  grade: '',
  className: '',
  slogan: '把散落的知识点，整理成一张可以走的地图。',
  term: '',
  maintainer: '',
};

/** 顶部导航：顺序即显示顺序 */
export type NavItem = {
  href: string;
  label: string;
  latin: string;
};

export const mainNav: NavItem[] = [
  { href: '/graph/', label: '学习图谱', latin: 'GRAPH' },
  { href: '/knowledge/', label: '知识库', latin: 'KNOWLEDGE' },
  { href: '/quiz/', label: '题库', latin: 'QUIZ' },
  { href: '/mistakes/', label: '错题本', latin: 'MISTAKES' },
  { href: '/library/', label: '资料库', latin: 'LIBRARY' },
  { href: '/faq/', label: '常见问题', latin: 'FAQ' },
];

/** 首页模块入口，与导航一一对应但带描述 */
export type ModuleCard = {
  href: string;
  index: string;
  title: string;
  latin: string;
  description: string;
  hint: string;
  icon: 'graph' | 'knowledge' | 'quiz' | 'notebook' | 'library' | 'faq';
  accent: string;
};

export const modules: ModuleCard[] = [
  {
    href: '/graph/',
    index: '01',
    title: '学习图谱',
    latin: 'LEARNING GRAPH',
    description: '把知识点之间的先后关系画成一张有向图，先修概念一目了然。',
    hint: '概念之间，先学什么后学什么',
    icon: 'graph',
    accent: 'rgb(var(--mint))',
  },
  {
    href: '/knowledge/',
    index: '02',
    title: '知识库',
    latin: 'KNOWLEDGE VAULT',
    description: 'Obsidian 目录里的智能电子书：章节层级、双链与标签都在，按目录往下读。',
    hint: '智能电子书 · 章节关联 · 双链笔记',
    icon: 'knowledge',
    accent: 'rgb(var(--accent))',
  },
  {
    href: '/quiz/',
    index: '03',
    title: '题库',
    latin: 'QUESTION BANK',
    description: '按学科与掌握程度筛题，做错的题一键收进错题本。',
    hint: '课堂练习与考试题集中刷',
    icon: 'quiz',
    accent: 'rgb(var(--iris))',
  },
  {
    href: '/mistakes/',
    index: '04',
    title: '错题本',
    latin: 'MISTAKE BOOK',
    description: '本地保存、随时添加：知识库里的题目一键加入，也可以自己录一道。',
    hint: '数据存在浏览器里，可导入导出',
    icon: 'notebook',
    accent: 'rgb(var(--rose))',
  },
  {
    href: '/library/',
    index: '05',
    title: '资料库',
    latin: 'LIBRARY',
    description: '课件、讲义、复习提纲集中存放，一个入口就能找到本学期资料。',
    hint: '按学科与类型归档',
    icon: 'library',
    accent: 'rgb(var(--accent))',
  },
  {
    href: '/faq/',
    index: '06',
    title: '常见问题',
    latin: 'FAQ',
    description: '收拢重复被问的问题：作业格式、考试范围、复习方法，一处解答。',
    hint: '一次写好，反复使用',
    icon: 'faq',
    accent: 'rgb(var(--mint))',
  },
];

/** 首页「三步上手」区块 */
export const steps = [
  {
    index: '01',
    title: '往 content/ 里放 Markdown',
    text: '学科、概念、题目、资料、FAQ 各自一个目录，文件带 frontmatter 元数据，Obsidian 也能直接打开编辑。',
  },
  {
    index: '02',
    title: '在知识库目录里写电子书',
    text: 'content/knowledge/ 是一个 Obsidian vault：目录层级就是章节层级，[[双链]] 自动变成站内链接。',
  },
  {
    index: '03',
    title: '把错题收进本子',
    text: '知识库里的 <problem> 块一键加入错题本，也可以在错题本页面手写或导入 JSON，全部存在本地。',
  },
];
