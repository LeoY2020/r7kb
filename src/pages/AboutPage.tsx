import { Icon } from '../components/ui';

const ROUTES = [
  {
    stage: '认识与定位',
    chapter: '认识智能电子书',
    result: '五级智能体教材的判断标准',
  },
  { stage: '结构与依赖', chapter: '学习图谱与概念依赖', result: '一张无环的概念依赖图' },
  { stage: '教学法', chapter: '章节设计与布鲁姆分类', result: '可测量的学习目标与章节大纲' },
  { stage: '交互', chapter: 'MicroSim 交互模拟', result: '每个难点的可玩模型' },
  { stage: '交付', chapter: '质检与发布', result: '质检清单与发布流水线' },
];

const CHAPTERS = [
  ['认识智能电子书', '什么是智能电子书，五级智能体教材分别长什么样，术语为什么要按标准写。'],
  ['学习图谱与概念依赖', '概念枚举、原子性、依赖边、拓扑排序与多路径。'],
  ['章节设计与布鲁姆分类', '六个认知层级、可测量的学习目标、章节大纲与概念覆盖检查。'],
  ['MicroSim 交互模拟', '设计原则、p5.js 实现、无障碍与性能。'],
  ['质检与发布', '质量度量、内容质检清单、部署与运营。'],
];

const MODULES = [
  ['知识库', '像资源管理器一样整理笔记目录，用块编辑器直接写正文，回车自动分段。'],
  ['题库', '知识库里的题目自动汇总，图形化填写题干、选项、答案与知识点。'],
  ['学习图谱', '拖动节点、连线建立先修关系，左键实线、右键虚线，拖掉端点即可断开。'],
  ['资料库', '文件夹 + 上传 + 信息表单，文件按目录存放，发布后随站点一起上线。'],
  ['发布', '一键提交到 inside 分支，自动构建静态站；审核通过后再合并到 main。'],
];

export default function AboutPage() {
  return (
    <div className="about">
      <header className="card about-hero">
        <p className="about-eyebrow">ABOUT · 关于</p>
        <h1>关于这个知识库</h1>
        <p className="about-lead">
          这是一座围绕「智能电子书」搭建的知识库。它不按学期章节罗列知识点，而是按照
          <b>做一本书的真实工序</b>
          来组织：先想清楚要教什么，再把概念排成依赖图，然后用学习目标约束每一章的写法，接着用
          MicroSim 把抽象概念变成可以拖动、可以试错的交互，最后用质检清单把关并发布上线。
        </p>
        <blockquote className="about-quote">
          「智能」不等于把 PDF 搬到网页上，而是让书知道自己的概念结构，并让读者在需要的地方动手。
        </blockquote>
      </header>

      <section className="card about-section">
        <p className="about-eyebrow">ROUTE · 本库的路线</p>
        <h2>从想法到上线，一共五步</h2>
        <div className="about-table">
          <div className="about-tr about-th">
            <span>阶段</span>
            <span>章节</span>
            <span>你会得到</span>
          </div>
          {ROUTES.map((item) => (
            <div key={item.stage} className="about-tr">
              <span>{item.stage}</span>
              <span>{item.chapter}</span>
              <span>{item.result}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card about-section">
        <p className="about-eyebrow">CHAPTERS · 五章</p>
        <h2>一条完整的构建流水线</h2>
        <p className="about-text">
          《智能电子书》是一份可以顺序读、也可以跳读的构建手册。它回答一个具体问题：
          <b>怎样把一门课，做成一本会解释自己结构、会出题、会让人动手的书？</b>
        </p>
        <ol className="about-list">
          {CHAPTERS.map(([title, text]) => (
            <li key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <div className="about-note">
          建议第一次阅读时只求走通流程，第二遍再回头补齐每章的细节。流程走通一次，比逐字读完更有价值。
        </div>
      </section>

      <section className="card about-section">
        <p className="about-eyebrow">RULES · 三条写作约定</p>
        <div className="about-rules">
          <div>
            <b>定义先行</b>
            <span>每个词第一次出现时给出定义，遵循 ISO 11179：精确、简洁、可区分、不循环。</span>
          </div>
          <div>
            <b>先补图，再补字</b>
            <span>每个新概念都必须能追到一条先修边，找不到就先补图，不要补文字。</span>
          </div>
          <div>
            <b>每章都要有输出</b>
            <span>每章至少安排一个可交互点或一道可作答的题目，让读者有输出。</span>
          </div>
        </div>
      </section>

      <section className="card about-section">
        <p className="about-eyebrow">STUDIO · 教师工作台</p>
        <h2>这个工作台能做什么</h2>
        <p className="about-text">
          工作台把写代码、改文件、跑命令这些操作都换成了图形界面，老师只需要填表和拖拽：
        </p>
        <div className="about-modules">
          {MODULES.map(([name, text]) => (
            <div key={name}>
              <span className="about-module-name">
                <Icon name="spark" size={13} />
                {name}
              </span>
              <span>{text}</span>
            </div>
          ))}
        </div>
        <p className="about-text">
          提交后会先进入 inside 分支并自动构建，审核确认后再合并到 main，正式发布到班级站点。
        </p>
      </section>

      <section className="card about-section about-source">
        <p>
          本库内容整理自开源项目{' '}
          <a href="https://github.com/dmccreary/ibook-skills" target="_blank" rel="noreferrer">
            ibook-skills
          </a>
          ，并结合中文教学场景重写。
        </p>
      </section>
    </div>
  );
}
