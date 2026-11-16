import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { Button, Icon, Spinner } from '../components/ui';

export default function LoginPage({
  configured,
  onSuccess,
}: {
  configured: boolean;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      await api.login(password);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={submit}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="brand-mark" style={{ width: 42, height: 42, borderRadius: 12 }}>
            <Icon name="spark" size={22} />
          </span>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 600 }}>教师工作台</h1>
            <div style={{ fontSize: 12, color: 'rgb(var(--ink-faint))', marginTop: 2 }}>
              班级知识库 · 图形化编辑与发布
            </div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'rgb(var(--ink-muted))', lineHeight: 1.7 }}>
          这里可以编辑知识库笔记、题库、学习图谱和资料库。提交后会先进入 <b>inside</b> 分支，
          审核通过后再同步到正式站点。
        </p>

        {!configured ? (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: 'rgb(var(--rose) / 0.08)',
              color: 'rgb(var(--rose))',
              fontSize: 12.5,
              lineHeight: 1.7,
            }}
          >
            服务端还没有配置访问密码或 GitHub token，请联系管理员完成部署配置。
          </div>
        ) : null}

        <label className="field">
          <span className="field-label">访问密码</span>
          <input
            className="input"
            type="password"
            autoFocus
            autoComplete="current-password"
            placeholder="请输入教师访问密码"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={!configured || loading}
          />
        </label>

        {error ? (
          <div style={{ fontSize: 12.5, color: 'rgb(var(--rose))' }}>{error}</div>
        ) : null}

        <Button variant="primary" type="submit" disabled={!configured || loading || !password}>
          {loading ? <Spinner size={15} /> : null}
          进入工作台
        </Button>

        <div style={{ fontSize: 11.5, color: 'rgb(var(--ink-faint))', lineHeight: 1.7 }}>
          GitHub token 只保存在服务端，浏览器拿不到；密码只用于拦截陌生人。
        </div>
      </form>
    </div>
  );
}
