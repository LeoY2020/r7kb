/**
 * GitHub API 的最小封装（仅服务端使用）。
 * - 所有写操作都走 Git Data API，一次提交多个文件，避免逐文件产生噪声提交。
 * - 网络抖动重试 2 次；422 / 409 由调用方决定是否重试。
 */

const API = 'https://api.github.com';
const UA = 'r7kb-teacher-studio';

export class GitHubError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
    this.body = body;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createGitHub(token) {
  async function request(path, options = {}) {
    const { method = 'GET', body, retries = 2 } = options;
    const url = path.startsWith('http') ? path : `${API}${path}`;
    for (let attempt = 0; ; attempt += 1) {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': UA,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (response.status === 404) return null;
        const text = await response.text();
        const data = text ? safeJson(text) : null;

        if (!response.ok) {
          const retryable = response.status >= 500 || response.status === 429;
          if (retryable && attempt < retries) {
            await sleep(600 * (attempt + 1));
            continue;
          }
          throw new GitHubError(
            `GitHub ${method} ${url.replace(API, '')} 失败：${response.status} ${
              data?.message ?? ''
            }`,
            response.status,
            data,
          );
        }
        return data;
      } catch (error) {
        if (error instanceof GitHubError) throw error;
        if (attempt < retries) {
          await sleep(600 * (attempt + 1));
          continue;
        }
        throw new GitHubError(`GitHub 请求失败：${error.message}`, 0, null);
      }
    }
  }

  return {
    request,
    repo: (ownerRepo) => `/repos/${ownerRepo}`,
  };
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 400) };
  }
}

/** 读取分支头；分支不存在返回 null */
export async function getBranchHead(gh, repo, branch) {
  const data = await gh.request(`/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
  if (!data) return null;
  return { sha: data.object.sha, ref: data.ref };
}

/** 分支不存在时从 base 创建 */
export async function ensureBranch(gh, repo, branch, base) {
  const head = await getBranchHead(gh, repo, branch);
  if (head) return head;
  const baseHead = await getBranchHead(gh, repo, base);
  if (!baseHead) throw new GitHubError(`${repo} 缺少基准分支 ${base}`, 404, null);
  await gh.request(`/repos/${repo}/git/refs`, {
    method: 'POST',
    body: { ref: `refs/heads/${branch}`, sha: baseHead.sha },
  });
  const created = await getBranchHead(gh, repo, branch);
  if (!created) throw new GitHubError(`创建分支 ${branch} 失败`, 0, null);
  return created;
}

export async function getCommit(gh, repo, sha) {
  return gh.request(`/repos/${repo}/git/commits/${sha}`);
}

export async function getTree(gh, repo, sha) {
  const data = await gh.request(`/repos/${repo}/git/trees/${sha}?recursive=1`);
  if (!data) throw new GitHubError(`读取 ${repo} 文件树失败`, 404, null);
  return data;
}

export async function getBlobBase64(gh, repo, sha) {
  const data = await gh.request(`/repos/${repo}/git/blobs/${sha}`);
  if (!data) throw new GitHubError(`读取 blob ${sha} 失败`, 404, null);
  if (data.encoding === 'base64') return data.content.replace(/\n/g, '');
  return Buffer.from(data.content ?? '', 'utf8').toString('base64');
}

/**
 * 在指定分支创建一次提交。
 * changes: [{ path, text } | { path, base64 }]
 */
export async function commitFiles(gh, repo, branch, changes, message, { base = 'main', retries = 2 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const head = await ensureBranch(gh, repo, branch, base);
    const baseCommit = await getCommit(gh, repo, head.sha);

    const blobs = [];
    for (const change of changes) {
      if (!change.path || change.path.includes('..')) {
        throw new GitHubError(`非法文件路径：${change.path}`, 400, null);
      }
      if (change.delete) {
        blobs.push({ path: change.path, mode: '100644', type: 'blob', sha: null });
        continue;
      }
      const body =
        typeof change.base64 === 'string'
          ? { content: change.base64, encoding: 'base64' }
          : { content: change.text ?? '', encoding: 'utf-8' };
      const blob = await gh.request(`/repos/${repo}/git/blobs`, { method: 'POST', body });
      blobs.push({ path: change.path, mode: '100644', type: 'blob', sha: blob.sha });
    }

    const tree = await gh.request(`/repos/${repo}/git/trees`, {
      method: 'POST',
      body: { base_tree: baseCommit.tree.sha, tree: blobs },
    });

    const commit = await gh.request(`/repos/${repo}/git/commits`, {
      method: 'POST',
      body: { message, tree: tree.sha, parents: [head.sha] },
    });

    try {
      await gh.request(`/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: 'PATCH',
        body: { sha: commit.sha, force: false },
      });
      return { sha: commit.sha, html_url: `https://github.com/${repo}/commit/${commit.sha}` };
    } catch (error) {
      // 分支被并发更新：重新读取最新头再试
      if (attempt < retries && (error.status === 422 || error.status === 409)) continue;
      throw error;
    }
  }
  throw new GitHubError('提交失败：分支持续被更新，请重试', 409, null);
}

export async function dispatchWorkflow(gh, repo, eventType, payload) {
  const result = await gh.request(`/repos/${repo}/dispatches`, {
    method: 'POST',
    body: { event_type: eventType, client_payload: payload },
  });
  return result ?? { ok: true };
}

export async function listWorkflowRuns(gh, repo, perPage = 10) {
  const data = await gh.request(`/repos/${repo}/actions/runs?per_page=${perPage}`);
  if (!data) return [];
  return (data.workflow_runs ?? []).map((run) => ({
    id: run.id,
    name: run.name,
    event: run.event,
    status: run.status,
    conclusion: run.conclusion,
    branch: run.head_branch,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    htmlUrl: run.html_url,
  }));
}

export async function getLatestCommit(gh, repo, branch) {
  const head = await getBranchHead(gh, repo, branch);
  if (!head) return null;
  const data = await gh.request(`/repos/${repo}/commits/${head.sha}`);
  if (!data) return null;
  return {
    sha: head.sha.slice(0, 7),
    message: data.commit?.message ?? '',
    date: data.commit?.committer?.date ?? data.commit?.author?.date ?? '',
    author: data.commit?.author?.name ?? '',
    htmlUrl: data.html_url,
  };
}
