import { useEffect, useState } from 'react';
import { api, ApiError, type SessionInfo } from './lib/api';
import { WorkspaceProvider, useWorkspace } from './lib/workspace';
import { Icon, IconButton, Spinner, ToastProvider, useToast, Button } from './components/ui';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import NotesPage from './pages/NotesPage';
import QuestionsPage from './pages/QuestionsPage';
import GraphPage from './pages/GraphPage';
import LibraryPage from './pages/LibraryPage';
import PublishPage from './pages/PublishPage';

export type Route = 'dashboard' | 'notes' | 'questions' | 'graph' | 'library' | 'publish';

const ROUTES: { id: Route; label: string; icon: string; title: string; sub: string }[] = [
  { id: 'dashboard', label: '概览', icon: 'home', title: '工作台概览', sub: '今天的知识库状态' },
  { id: 'notes', label: '知识库', icon: 'notes', title: '知识库笔记', sub: '像写文档一样编辑 Markdown' },
  { id: 'questions', label: '题库', icon: 'quiz', title: '题库', sub: '知识库里的题目会自动进入题库' },
  { id: 'graph', label: '学习图谱', icon: 'graph', title: '学习图谱', sub: '拖动节点、拉线建立关系' },
  { id: 'library', label: '资料库', icon: 'library', title: '资料库', sub: '上传文件并填写展示信息' },
  { id: 'publish', label: '发布', icon: 'publish', title: '发布中心', sub: '提交到 inside 分支并自动构建' },
];

function useHashRoute(): [Route, (route: Route) => void] {
  const read = (): Route => {
    const raw = window.location.hash.replace(/^#\/?/, '');
    return (ROUTES.find((route) => route.id === raw)?.id ?? 'dashboard') as Route;
  };
  const [route, setRoute] = useState<Route>(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = (next: Route) => {
    window.location.hash = `/${next}`;
    setRoute(next);
  };

  return [route, navigate];
}

function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('r7kb-studio-theme', next);
    setTheme(next);
  };
  return (
    <IconButton
      icon={theme === 'dark' ? 'sun' : 'moon'}
      label={theme === 'dark' ? '切换为浅色' : '切换为深色'}
      onClick={toggle}
    />
  );
}

function Studio({ session }: { session: SessionInfo }) {
  const [route, navigate] = useHashRoute();
  const { changeCount, loading, error, refresh, notes } = useWorkspace();
  const toast = useToast();
  const meta = ROUTES.find((item) => item.id === route) ?? ROUTES[0];

  useEffect(() => {
    if (error) toast.show(error, 'error');
  }, [error, toast]);

  return (
    <div className="studio">
      <aside className="rail">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="spark" size={18} />
          </span>
          <div>
            <div className="brand-name">教师工作台</div>
            <div className="brand-sub">班级知识库 · r7kb</div>
          </div>
        </div>

        <nav className="rail-nav">
          {ROUTES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="rail-item"
              data-active={route === item.id}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} size={17} />
              <span className="label">{item.label}</span>
              {item.id === 'publish' && changeCount > 0 ? (
                <span className="badge">{changeCount}</span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="rail-footer">
          <div>源码：{session.repo}</div>
          <div>发布：{session.webRepo}</div>
          <div>分支：{session.workBranch}</div>
          <button
            type="button"
            className="rail-item"
            style={{ marginTop: 6 }}
            onClick={async () => {
              await api.logout();
              window.location.reload();
            }}
          >
            <Icon name="logout" size={16} />
            <span className="label">退出登录</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <h1>{meta.title}</h1>
            <div className="topbar-sub">{meta.sub}</div>
          </div>
          <div className="topbar-actions">
            {loading ? <Spinner /> : null}
            <span className="pill">
              <Icon name="notes" size={13} />
              {notes.length} 篇笔记
            </span>
            <IconButton
              icon="refresh"
              label="刷新内容"
              disabled={loading}
              onClick={async () => {
                await refresh(true);
                toast.show('已刷新最新内容');
              }}
            />
            <Button
              variant="primary"
              size="sm"
              icon="publish"
              onClick={() => navigate('publish')}
            >
              发布{changeCount > 0 ? `（${changeCount}）` : ''}
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <main className="page">
          {route === 'dashboard' ? <DashboardPage onNavigate={navigate} /> : null}
          {route === 'notes' ? <NotesPage /> : null}
          {route === 'questions' ? <QuestionsPage onOpenNote={() => navigate('notes')} /> : null}
          {route === 'graph' ? <GraphPage /> : null}
          {route === 'library' ? <LibraryPage /> : null}
          {route === 'publish' ? <PublishPage /> : null}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [failed, setFailed] = useState('');

  const loadSession = () => {
    api
      .session()
      .then(setSession)
      .catch((err) => setFailed(err instanceof ApiError ? err.message : '无法连接服务端'));
  };

  useEffect(loadSession, []);

  return (
    <ToastProvider>
      {session === null ? (
        <div className="loading-screen">
          {failed ? (
            <div className="card" style={{ padding: 24, maxWidth: 420 }}>
              <p style={{ marginBottom: 12 }}>{failed}</p>
              <Button onClick={loadSession}>重试</Button>
            </div>
          ) : (
            <>
              <Spinner size={22} />
              <span>正在连接工作台…</span>
            </>
          )}
        </div>
      ) : session.authed ? (
        <WorkspaceProvider>
          <Studio session={session} />
        </WorkspaceProvider>
      ) : (
        <LoginPage
          configured={session.configured}
          onSuccess={() => setSession({ ...session, authed: true })}
        />
      )}
    </ToastProvider>
  );
}
