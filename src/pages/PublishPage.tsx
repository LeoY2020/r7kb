import { useEffect, useMemo, useState } from 'react';
import { LINKS_PATH, LIBRARY_PATH } from '../lib/notes';
import { parseQuestionBlocks } from '../lib/questions';
import { useWorkspace } from '../lib/workspace';
import type { PublishStatus } from '../lib/types';
import { api } from '../lib/api';
import {
  Button,
  Empty,
  Field,
  Icon,
  Spinner,
  formatDate,
  useToast,
} from '../components/ui';

type Check = { level: 'error' | 'warn'; message: string };

export default function PublishPage() {
  const {
    notes,
    snapshot,
    fileText,
    changedFiles,
    deletions,
    uploads,
    changeCount,
    publish,
    resetAll,
    refresh,
  } = useWorkspace();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    commit: { sha: string; html_url: string };
    dispatched: boolean;
    warning: string;
  } | null>(null);
  const [status, setStatus] = useState<PublishStatus | null>(null);
  const [statusError, setStatusError] = useState('');

  const loadStatus = async () => {
    try {
      const data = await api.publishStatus();
      setStatus(data);
      setStatusError('');
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : '读取构建状态失败');
    }
  };

  useEffect(() => {
    void loadStatus();
    const timer = window.setInterval(loadStatus, 8000);
    return () => window.clearInterval(timer);
  }, []);

  const checks = useMemo<Check[]>(() => {
    const out: Check[] = [];

    const slugCount = new Map<string, number>();
    for (const note of notes) {
      slugCount.set(note.slug, (slugCount.get(note.slug) ?? 0) + 1);
      if (!note.slug.trim()) out.push({ level: 'error', message: `《${note.title}》缺少 slug` });
      if (!note.title.trim()) out.push({ level: 'error', message: `${note.path} 缺少标题` });
    }
    for (const [slug, count] of slugCount) {
      if (count > 1) out.push({ level: 'error', message: `slug 重复：${slug}` });
    }

    for (const note of notes) {
      for (const item of parseQuestionBlocks(note.body, note.slug)) {
        if (!item.question.stem.trim()) {
          out.push({
            level: 'error',
            message: `《${note.title}》第 ${item.index + 1} 题题干为空`,
          });
        }
        if (!item.question.answer.trim()) {
          out.push({
            level: 'error',
            message: `《${note.title}》第 ${item.index + 1} 题缺少答案`,
          });
        }
        if (item.legacy) {
          out.push({
            level: 'warn',
            message: `《${note.title}》第 ${item.index + 1} 题仍是旧写法（构建可用，建议改成标签写法）`,
          });
        }
      }
    }

    const libraryText = fileText(LIBRARY_PATH);
    if (libraryText) {
      try {
        const parsed = JSON.parse(libraryText) as { resources?: unknown };
        if (!Array.isArray(parsed.resources)) {
          out.push({ level: 'error', message: '资料库 items.json 缺少 resources 数组' });
        }
      } catch {
        out.push({ level: 'error', message: '资料库 items.json 不是合法 JSON' });
      }
    }

    const linksText = fileText(LINKS_PATH);
    if (linksText) {
      try {
        const parsed = JSON.parse(linksText) as {
          links?: Record<string, { prerequisites?: string[]; next?: string[] }>;
        };
        const links = parsed.links ?? {};
        const known = new Set(notes.map((note) => note.slug));
        for (const [slug, entry] of Object.entries(links)) {
          if (!known.has(slug)) {
            out.push({ level: 'error', message: `图谱连线指向了不存在的笔记：${slug}` });
            continue;
          }
          for (const target of [...(entry.next ?? []), ...(entry.prerequisites ?? [])]) {
            if (!known.has(target)) {
              out.push({ level: 'error', message: `图谱连线 ${slug} → ${target} 的目标不存在` });
            }
          }
        }
        // 实线成环检查
        const state = new Map<string, 0 | 1 | 2>();
        const edges = new Map<string, string[]>();
        for (const [slug, entry] of Object.entries(links)) {
          const list = edges.get(slug) ?? [];
          for (const target of entry.next ?? []) list.push(target);
          edges.set(slug, list);
        }
        const visit = (slug: string): boolean => {
          const current = state.get(slug) ?? 0;
          if (current === 1) return true;
          if (current === 2) return false;
          state.set(slug, 1);
          for (const next of edges.get(slug) ?? []) {
            if (visit(next)) return true;
          }
          state.set(slug, 2);
          return false;
        };
        for (const slug of Object.keys(links)) {
          if (visit(slug)) {
            out.push({ level: 'error', message: `图谱实线成环，构建会失败（从 ${slug} 开始）` });
            break;
          }
        }
      } catch {
        out.push({ level: 'error', message: '图谱 chapter-links.json 不是合法 JSON' });
      }
    }

    for (const upload of uploads) {
      if (upload.size > 20 * 1024 * 1024) {
        out.push({ level: 'error', message: `文件过大：${upload.name}` });
      }
    }

    return out;
  }, [notes, fileText, uploads]);

  const errors = checks.filter((check) => check.level === 'error');
  const warnings = checks.filter((check) => check.level === 'warn');
  const canPublish = changeCount > 0 && errors.length === 0 && !busy;

  const submit = async () => {
    if (!canPublish) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await publish(
        message.trim() || `teacher: 更新 ${changeCount} 个文件`,
      );
      setResult(response);
      setMessage('');
      toast.show('已提交到 inside 分支');
      window.setTimeout(loadStatus, 2500);
      window.setTimeout(loadStatus, 8000);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : '发布失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="list-page" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(280px,1fr)', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="section-head" style={{ marginBottom: 10 }}>
            <h2>本次改动</h2>
            <span className="pill">{changeCount} 个文件</span>
            {changeCount > 0 ? (
              <Button size="sm" variant="ghost" onClick={resetAll} style={{ marginLeft: 'auto' }}>
                全部撤销
              </Button>
            ) : null}
          </div>

          {changeCount === 0 ? (
            <Empty>还没有改动。编辑知识库、题库、图谱或资料库后，改动会汇总到这里。</Empty>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {changedFiles.map((file) => (
                <div key={file.path} className="change-row">
                  <span className="status-dot" />
                  <span className="chip" style={{ background: 'rgb(var(--mint) / 0.15)', color: 'rgb(var(--mint))' }}>
                    {file.status === 'added' ? '新增' : '修改'}
                  </span>
                  <span className="change-path" style={{ flex: 1 }}>
                    {file.path}
                  </span>
                </div>
              ))}
              {deletions.map((path) => (
                <div key={path} className="change-row">
                  <span className="status-dot" style={{ background: 'rgb(var(--rose))' }} />
                  <span className="chip" style={{ background: 'rgb(var(--rose) / 0.12)', color: 'rgb(var(--rose))' }}>
                    删除
                  </span>
                  <span className="change-path" style={{ flex: 1 }}>
                    {path}
                  </span>
                </div>
              ))}
              {uploads.map((upload) => (
                <div key={upload.path} className="change-row">
                  <span className="status-dot" style={{ background: 'rgb(var(--iris))' }} />
                  <span className="chip" style={{ background: 'rgb(var(--iris) / 0.12)', color: 'rgb(var(--iris))' }}>
                    上传
                  </span>
                  <span className="change-path" style={{ flex: 1 }}>
                    {upload.path}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div className="section-head" style={{ marginBottom: 10 }}>
            <h2>发布前检查</h2>
            {errors.length === 0 ? (
              <span className="pill" style={{ color: '#30a46c' }}>
                <Icon name="check" size={13} /> 通过
              </span>
            ) : (
              <span className="pill" style={{ color: 'rgb(var(--rose))' }}>
                {errors.length} 个问题
              </span>
            )}
          </div>
          {checks.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'rgb(var(--ink-faint))' }}>
              slug、题目答案、图谱连线、资料 JSON 都会在提交前检查。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...errors, ...warnings].map((check, index) => (
                <div
                  key={`${check.message}-${index}`}
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.6,
                    padding: '7px 10px',
                    borderRadius: 9,
                    background:
                      check.level === 'error' ? 'rgb(var(--rose) / 0.08)' : 'rgb(var(--ink) / 0.03)',
                    color: check.level === 'error' ? 'rgb(var(--rose))' : 'rgb(var(--ink-muted))',
                  }}
                >
                  {check.message}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 18 }}>
          <Field label="提交说明" hint="留空时自动生成，例如：teacher: 更新 3 个文件">
            <input
              className="input"
              value={message}
              placeholder="这次改了什么？"
              onChange={(event) => setMessage(event.target.value)}
            />
          </Field>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <Button variant="primary" icon="publish" disabled={!canPublish} onClick={submit}>
              {busy ? <Spinner size={15} /> : null}
              提交到 inside 并构建
            </Button>
            <Button icon="refresh" onClick={() => refresh(true)} disabled={busy}>
              重新载入仓库内容
            </Button>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: 'rgb(var(--ink-faint))', lineHeight: 1.7 }}>
            提交后会自动触发构建：源码进入 <b>{snapshot?.repo ?? 'r7kb'}</b> 的{' '}
            {snapshot?.workBranch ?? 'inside'} 分支，构建产物进入{' '}
            <b>{snapshot?.webRepo ?? 'r7kb-web'}</b> 的{' '}
            {snapshot?.workBranch ?? 'inside'} 分支。你在 GitHub 上审核后把 inside 合并到 main，正式站
            才会更新。
          </div>

          {result ? (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 12,
                background: 'rgb(var(--accent-soft))',
                fontSize: 12.5,
                lineHeight: 1.7,
                color: 'rgb(var(--accent))',
              }}
            >
              源码已提交：
              <a href={result.commit.html_url} target="_blank" rel="noreferrer">
                {result.commit.sha.slice(0, 7)}
              </a>
              　
              {result.dispatched ? '已触发自动构建，下面看进度。' : '未触发构建。'}
              {result.warning ? <div style={{ color: 'rgb(var(--rose))' }}>{result.warning}</div> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="section-head" style={{ marginBottom: 8 }}>
            <h2>构建状态</h2>
            <Button size="sm" variant="ghost" icon="refresh" onClick={loadStatus} style={{ marginLeft: 'auto' }}>
              刷新
            </Button>
          </div>
          {statusError ? (
            <div style={{ fontSize: 12.5, color: 'rgb(var(--rose))' }}>{statusError}</div>
          ) : null}
          {!status ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
              <Spinner size={14} /> 正在读取…
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                <div style={{ fontSize: 12.5, color: 'rgb(var(--ink-muted))' }}>
                  源码最新：{status.source ? status.source.message.slice(0, 40) : '—'}
                  {status.source ? (
                    <span style={{ color: 'rgb(var(--ink-faint))' }}> · {formatDate(status.source.date)}</span>
                  ) : null}
                </div>
                <div style={{ fontSize: 12.5, color: 'rgb(var(--ink-muted))' }}>
                  站点最新：{status.site ? status.site.message.slice(0, 40) : '—'}
                  {status.site ? (
                    <span style={{ color: 'rgb(var(--ink-faint))' }}> · {formatDate(status.site.date)}</span>
                  ) : null}
                </div>
              </div>

              {status.runs.length === 0 ? (
                <Empty>还没有构建记录。</Empty>
              ) : (
                status.runs.slice(0, 6).map((run) => (
                  <div key={run.id} className="run-row">
                    <span
                      className="status-dot"
                      data-status={run.conclusion ?? run.status}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {run.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgb(var(--ink-faint))' }}>
                        {run.event === 'repository_dispatch' ? '自动构建' : run.event} ·{' '}
                        {formatDate(run.createdAt)}
                      </div>
                    </div>
                    <a href={run.htmlUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11.5 }}>
                      日志
                    </a>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div className="section-head" style={{ marginBottom: 8 }}>
            <h2>发布流程</h2>
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.9, color: 'rgb(var(--ink-muted))' }}>
            <li>老师在工作台提交改动</li>
            <li>源码写入 <code>r7kb@inside</code></li>
            <li>GitHub Actions 自动构建静态站</li>
            <li>产物推送到 <code>r7kb-web@inside</code></li>
            <li>管理员审核并把 inside 合并到 main</li>
            <li>Netlify 从 main 发布正式站</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
