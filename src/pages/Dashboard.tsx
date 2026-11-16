import { useMemo } from 'react';
import { LIBRARY_PATH } from '../lib/notes';
import { parseQuestionBlocks } from '../lib/questions';
import { useWorkspace } from '../lib/workspace';
import type { Route } from '../App';
import { Button, Empty, Icon, formatDate } from '../components/ui';

export default function DashboardPage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { notes, snapshot, fileText, changeCount, uploads, loading } = useWorkspace();

  const questions = useMemo(
    () => notes.reduce((total, note) => total + parseQuestionBlocks(note.body, note.slug).length, 0),
    [notes],
  );

  const libraryCount = useMemo(() => {
    try {
      const data = JSON.parse(fileText(LIBRARY_PATH) ?? '{}') as { resources?: unknown[] };
      return data.resources?.length ?? 0;
    } catch {
      return 0;
    }
  }, [fileText]);

  const recent = useMemo(
    () =>
      [...notes]
        .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))
        .slice(0, 5),
    [notes],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="stat-grid">
        {[
          { label: '知识库笔记', value: notes.length, icon: 'notes', route: 'notes' as Route },
          { label: '题目', value: questions, icon: 'quiz', route: 'questions' as Route },
          { label: '资料', value: libraryCount, icon: 'library', route: 'library' as Route },
          { label: '待发布改动', value: changeCount, icon: 'publish', route: 'publish' as Route },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            className="card stat"
            style={{ textAlign: 'left', border: '1px solid var(--line)', cursor: 'pointer' }}
            onClick={() => onNavigate(item.route)}
          >
            <Icon name={item.icon} size={18} />
            <div className="stat-value" style={{ marginTop: 8 }}>
              {item.value}
            </div>
            <div className="stat-label">{item.label}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(260px,1fr)', gap: 16, alignItems: 'start' }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="section-head">
            <h2>从哪里开始</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
            {[
              { route: 'notes' as Route, icon: 'notes', title: '写知识库', desc: '像写文档一样编辑正文，插入题目卡片。' },
              { route: 'graph' as Route, icon: 'graph', title: '连学习图谱', desc: '拖节点、拉实线/虚线，断线直接拽下来。' },
              { route: 'library' as Route, icon: 'library', title: '传资料', desc: '拖文件进来，填好标题与分类。' },
              { route: 'publish' as Route, icon: 'publish', title: '发布', desc: '一键提交，自动构建到 inside 分支。' },
            ].map((item) => (
              <button
                key={item.route}
                type="button"
                className="card-quiet"
                style={{ padding: 14, textAlign: 'left', cursor: 'pointer' }}
                onClick={() => onNavigate(item.route)}
              >
                <Icon name={item.icon} size={17} />
                <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 8 }}>{item.title}</div>
                <div style={{ fontSize: 11.5, color: 'rgb(var(--ink-faint))', lineHeight: 1.6, marginTop: 4 }}>
                  {item.desc}
                </div>
              </button>
            ))}
          </div>

          <div className="hairline" style={{ margin: '18px 0 14px' }} />
          <div className="section-head">
            <h2>最近更新</h2>
          </div>
          {recent.length === 0 ? (
            <Empty>{loading ? '正在载入…' : '还没有笔记。'}</Empty>
          ) : (
            recent.map((note) => (
              <div key={note.path} className="run-row">
                <Icon name="file" size={14} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {note.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgb(var(--ink-faint))' }}>
                    {note.dir || '根目录'} · {note.updated || '未标注日期'}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onNavigate('notes')}>
                  打开
                </Button>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <div className="section-head" style={{ marginBottom: 8 }}>
              <h2>仓库状态</h2>
            </div>
            <div style={{ fontSize: 12.5, color: 'rgb(var(--ink-muted))', lineHeight: 1.9 }}>
              <div>源码：{snapshot?.repo ?? '—'}</div>
              <div>发布：{snapshot?.webRepo ?? '—'}</div>
              <div>读取分支：{snapshot?.branch ?? '—'}</div>
              <div>提交：{snapshot ? snapshot.sha.slice(0, 7) : '—'}</div>
              <div>载入：{snapshot ? formatDate(snapshot.loadedAt) : '—'}</div>
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="section-head" style={{ marginBottom: 8 }}>
              <h2>待上传文件</h2>
            </div>
            {uploads.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'rgb(var(--ink-faint))' }}>没有待上传的文件。</div>
            ) : (
              uploads.map((upload) => (
                <div key={upload.path} className="run-row">
                  <Icon name="upload" size={14} />
                  <span style={{ flex: 1, fontSize: 12 }}>{upload.name}</span>
                </div>
              ))
            )}
            <Button size="sm" variant="secondary" style={{ marginTop: 10 }} onClick={() => onNavigate('publish')}>
              去发布
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
