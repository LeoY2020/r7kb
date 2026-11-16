/**
 * r7kb 教师工作台 · 服务端
 *
 * 职责：
 *   1. 密码登录（HttpOnly Cookie），GitHub token 只存在于服务端环境变量；
 *   2. 从 r7kb 仓库读取 content/ 下的 Markdown / JSON 给编辑器；
 *   3. 把老师的改动一次性提交到 r7kb 的 inside 分支；
 *   4. 触发 r7kb-web 的 Actions 构建（构建结果推送到 r7kb-web 的 inside 分支）。
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import {
  createGitHub,
  commitFiles,
  dispatchWorkflow,
  ensureBranch,
  getBlobBase64,
  getBranchHead,
  getLatestCommit,
  getTree,
  listWorkflowRuns,
  GitHubError,
} from './github.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 8801);
const HOST = process.env.HOST || '0.0.0.0';
const GH_TOKEN = (process.env.GH_TOKEN || '').trim();
const SOURCE_REPO = process.env.GH_REPO || 'LeoY2020/r7kb';
const WEB_REPO = process.env.WEB_REPO || 'LeoY2020/r7kb-web';
const WORK_BRANCH = process.env.GH_BRANCH || 'inside';
const BASE_BRANCH = process.env.GH_BASE || 'main';
const PASSWORD = (process.env.STUDIO_PASSWORD || '').trim();
const SESSION_SECRET = (process.env.SESSION_SECRET || PASSWORD || 'r7kb-studio').trim();

const CONTENT_PREFIX = 'content/';
const RESOURCES_PREFIX = 'public/resources/';
const TEXT_FILE = /\.(md|json)$/i;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const gh = GH_TOKEN ? createGitHub(GH_TOKEN) : null;
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '45mb' }));

/* ------------------------------------------------------------------ */
/* 会话                                                                */
/* ------------------------------------------------------------------ */

const sign = (value) =>
  crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');

function makeSession() {
  const issued = Date.now().toString(36);
  return `${issued}.${sign(issued)}`;
}

function verifySession(raw) {
  if (!raw || typeof raw !== 'string') return false;
  const [issued, signature] = raw.split('.');
  if (!issued || !signature) return false;
  const expected = sign(issued);
  if (expected.length !== signature.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return false;
  const age = Date.now() - parseInt(issued, 36);
  return Number.isFinite(age) && age >= 0 && age < 7 * 24 * 3600 * 1000;
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

const loginAttempts = new Map();

function sessionCookie(req) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return [
    `studio_session=${makeSession()}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=604800',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

function requireAuth(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  if (!verifySession(cookies.studio_session)) {
    res.status(401).json({ error: '未登录或登录已过期' });
    return;
  }
  next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, configured: Boolean(gh && PASSWORD), repo: SOURCE_REPO, webRepo: WEB_REPO });
});

app.get('/api/session', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  res.set('Cache-Control', 'no-store').json({
    authed: verifySession(cookies.studio_session),
    configured: Boolean(gh && PASSWORD),
    repo: SOURCE_REPO,
    webRepo: WEB_REPO,
    workBranch: WORK_BRANCH,
  });
});

app.post('/api/login', (req, res) => {
  if (!PASSWORD) {
    res.status(503).json({ error: '服务端没有配置访问密码，暂时无法登录' });
    return;
  }
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const attempt = loginAttempts.get(ip) ?? { count: 0, first: now };
  if (now - attempt.first > 10 * 60 * 1000) {
    attempt.count = 0;
    attempt.first = now;
  }
  if (attempt.count >= 10) {
    res.status(429).json({ error: '尝试次数过多，请 10 分钟后再试' });
    return;
  }

  const password = String(req.body?.password ?? '');
  const a = crypto.createHash('sha256').update(password).digest();
  const b = crypto.createHash('sha256').update(PASSWORD).digest();
  const ok = crypto.timingSafeEqual(a, b);

  if (!ok) {
    attempt.count += 1;
    loginAttempts.set(ip, attempt);
    res.status(401).json({ error: '密码不正确' });
    return;
  }

  loginAttempts.delete(ip);
  res.setHeader('Set-Cookie', sessionCookie(req));
  res.json({ ok: true });
});

app.post('/api/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'studio_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* 内容读取                                                            */
/* ------------------------------------------------------------------ */

let cache = { sha: '', data: null };
let branchInfo = { branch: '', sha: '', at: 0 };

async function resolveBranch() {
  if (gh) {
    const work = await getBranchHead(gh, SOURCE_REPO, WORK_BRANCH);
    if (work) return { branch: WORK_BRANCH, sha: work.sha };
    const base = await getBranchHead(gh, SOURCE_REPO, BASE_BRANCH);
    if (base) return { branch: BASE_BRANCH, sha: base.sha };
    throw new GitHubError(`找不到分支 ${WORK_BRANCH} / ${BASE_BRANCH}`, 404, null);
  }
  throw new GitHubError('服务端没有配置 GH_TOKEN', 503, null);
}

async function mapLimit(items, limit, worker) {
  const out = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return out;
}

async function loadContent({ force = false } = {}) {
  if (!gh) throw new GitHubError('服务端没有配置 GH_TOKEN', 503, null);
  const resolved = await resolveBranch();
  branchInfo = { ...resolved, at: Date.now() };
  if (!force && cache.sha === resolved.sha && cache.data) return cache.data;

  const tree = await getTree(gh, SOURCE_REPO, resolved.sha);
  const entries = tree.tree ?? [];

  const textEntries = entries.filter(
    (entry) =>
      entry.type === 'blob' &&
      entry.path.startsWith(CONTENT_PREFIX) &&
      TEXT_FILE.test(entry.path) &&
      (entry.size ?? 0) <= MAX_FILE_BYTES,
  );

  const files = await mapLimit(textEntries, 8, async (entry) => {
    const base64 = await getBlobBase64(gh, SOURCE_REPO, entry.sha);
    return {
      path: entry.path,
      text: Buffer.from(base64, 'base64').toString('utf8'),
      size: entry.size ?? 0,
    };
  });

  const resources = entries
    .filter((entry) => entry.type === 'blob' && entry.path.startsWith(RESOURCES_PREFIX))
    .map((entry) => ({ path: entry.path, size: entry.size ?? 0 }));

  const data = {
    branch: resolved.branch,
    baseBranch: BASE_BRANCH,
    workBranch: WORK_BRANCH,
    sha: resolved.sha,
    repo: SOURCE_REPO,
    webRepo: WEB_REPO,
    files,
    resources,
    loadedAt: new Date().toISOString(),
  };
  cache = { sha: resolved.sha, data };
  return data;
}

app.get('/api/content', requireAuth, async (req, res, next) => {
  try {
    const force = req.query.refresh === '1';
    const data = await loadContent({ force });
    res.set('Cache-Control', 'no-store').json(data);
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ */
/* 提交 / 发布                                                         */
/* ------------------------------------------------------------------ */

function assertAllowedPath(filePath) {
  if (
    typeof filePath !== 'string' ||
    filePath.includes('..') ||
    (!filePath.startsWith(CONTENT_PREFIX) && !filePath.startsWith(RESOURCES_PREFIX))
  ) {
    throw new GitHubError(`不允许写入该路径：${filePath}`, 400, null);
  }
  return filePath;
}

app.post('/api/publish', requireAuth, async (req, res, next) => {
  try {
    if (!gh) throw new GitHubError('服务端没有配置 GH_TOKEN', 503, null);

    const textFiles = Array.isArray(req.body?.files) ? req.body.files : [];
    const uploads = Array.isArray(req.body?.uploads) ? req.body.uploads : [];
    const deletions = Array.isArray(req.body?.deletions) ? req.body.deletions : [];
    if (textFiles.length + uploads.length + deletions.length === 0) {
      res.status(400).json({ error: '没有需要提交的改动' });
      return;
    }

    const changes = [];
    for (const file of textFiles) {
      assertAllowedPath(file.path);
      if (typeof file.text !== 'string') {
        res.status(400).json({ error: `文件内容必须是文本：${file.path}` });
        return;
      }
      changes.push({ path: file.path, text: file.text });
    }
    for (const path of deletions) {
      assertAllowedPath(path);
      changes.push({ path, delete: true });
    }
    for (const upload of uploads) {
      assertAllowedPath(upload.path);
      if (!upload.path.startsWith(RESOURCES_PREFIX)) {
        res.status(400).json({ error: `上传文件必须放在 public/resources/ 下：${upload.path}` });
        return;
      }
      const buffer = Buffer.from(String(upload.base64 ?? ''), 'base64');
      if (buffer.length === 0) {
        res.status(400).json({ error: `上传文件为空：${upload.path}` });
        return;
      }
      if (buffer.length > MAX_UPLOAD_BYTES) {
        res.status(413).json({ error: `文件过大（上限 20MB）：${upload.path}` });
        return;
      }
      changes.push({ path: upload.path, base64: buffer.toString('base64') });
    }

    const message =
      String(req.body?.message ?? '').trim().slice(0, 200) ||
      `teacher: 更新 ${changes.length} 个文件`;

    await ensureBranch(gh, SOURCE_REPO, WORK_BRANCH, BASE_BRANCH);
    const commit = await commitFiles(gh, SOURCE_REPO, WORK_BRANCH, changes, message, {
      base: BASE_BRANCH,
    });
    cache = { sha: '', data: null };

    let dispatched = false;
    let warning = '';
    try {
      await dispatchWorkflow(gh, WEB_REPO, 'publish-inside', {
        source_repo: SOURCE_REPO,
        source_branch: WORK_BRANCH,
        commit: commit.sha,
        message,
      });
      dispatched = true;
    } catch (error) {
      warning = `源码已提交，但触发自动构建失败：${error.message}`;
    }

    res.json({
      ok: true,
      commit,
      dispatched,
      warning,
      branch: WORK_BRANCH,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/publish/status', requireAuth, async (_req, res, next) => {
  try {
    if (!gh) throw new GitHubError('服务端没有配置 GH_TOKEN', 503, null);
    const [runs, inside, main] = await Promise.all([
      listWorkflowRuns(gh, WEB_REPO, 8).catch(() => []),
      getLatestCommit(gh, SOURCE_REPO, WORK_BRANCH).catch(() => null),
      getLatestCommit(gh, WEB_REPO, WORK_BRANCH).catch(() => null),
    ]);
    res.set('Cache-Control', 'no-store').json({
      runs,
      source: inside,
      site: main,
      webRepo: WEB_REPO,
      sourceRepo: SOURCE_REPO,
      workBranch: WORK_BRANCH,
    });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ */
/* 静态资源 + 错误处理                                                 */
/* ------------------------------------------------------------------ */

const clientCandidates = [
  process.env.CLIENT_DIR,
  path.join(__dirname, 'client'),
  path.join(__dirname, '..', 'dist', 'client'),
].filter(Boolean);
const clientDir = clientCandidates.find((dir) => fs.existsSync(path.join(dir, 'index.html')));
if (clientDir) {
  app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(clientDir, 'index.html'));
  });
} else {
  console.warn('[studio] 未找到前端构建产物，请先执行 npm run build');
}

app.use('/api', (_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.use((error, _req, res, _next) => {
  const status = error instanceof GitHubError ? Math.max(400, error.status || 500) : 500;
  const message = error?.message || '服务器内部错误';
  if (status >= 500) console.error('[studio]', error);
  res.status(status).json({ error: message });
});

app.listen(PORT, HOST, () => {
  console.log(`[studio] listening on http://${HOST}:${PORT}`);
  if (!GH_TOKEN) console.warn('[studio] 缺少 GH_TOKEN，读写接口不可用');
  if (!PASSWORD) console.warn('[studio] 缺少 STUDIO_PASSWORD，登录被禁用');
});
