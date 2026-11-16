/**
 * 工作区：把服务端快照 + 本地改动合并成编辑用的数据。
 * 所有编辑只改内存，点「发布」时才一次性提交到仓库。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError } from './api';
import { isVaultNotePath, parseNote, serializeNote } from './notes';
import type { ContentSnapshot, Note } from './types';

export type Upload = { path: string; base64: string; size: number; name: string };
export type FileMove = { from: string; to: string };

type WorkspaceValue = {
  snapshot: ContentSnapshot | null;
  loading: boolean;
  error: string;
  notes: Note[];
  noteByPath: (path: string) => Note | undefined;
  fileText: (path: string) => string | undefined;
  isDirty: (path: string) => boolean;
  updateFile: (path: string, text: string) => void;
  saveNote: (note: Note) => void;
  addFile: (path: string, text: string) => void;
  deleteFile: (path: string) => void;
  restoreFile: (path: string) => void;
  deletions: string[];
  uploads: Upload[];
  addUpload: (upload: Upload) => void;
  removeUpload: (path: string) => void;
  moves: FileMove[];
  addMove: (move: FileMove) => void;
  changedFiles: { path: string; text: string; status: 'modified' | 'added' }[];
  changeCount: number;
  refresh: (force?: boolean) => Promise<void>;
  publish: (message: string) => Promise<{
    commit: { sha: string; html_url: string };
    dispatched: boolean;
    warning: string;
  }>;
  resetAll: () => void;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<ContentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [deletions, setDeletions] = useState<string[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [moves, setMoves] = useState<FileMove[]>([]);

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.content(force);
      setSnapshot(data);
      setEdits({});
      setDeletions([]);
      setUploads([]);
      setMoves([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '读取内容失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  const baseFiles = useMemo(() => {
    const map = new Map<string, string>();
    for (const file of snapshot?.files ?? []) map.set(file.path, file.text);
    return map;
  }, [snapshot]);

  const files = useMemo(() => {
    const map = new Map(baseFiles);
    for (const [filePath, text] of Object.entries(edits)) map.set(filePath, text);
    for (const filePath of deletions) map.delete(filePath);
    return map;
  }, [baseFiles, edits, deletions]);

  const notes = useMemo(() => {
    return [...files.entries()]
      .filter(([filePath]) => isVaultNotePath(filePath))
      .map(([filePath, text]) => parseNote(filePath, text))
      .sort((a, b) => {
        if (a.dir !== b.dir) return a.dir.localeCompare(b.dir, 'zh-Hans-CN');
        if (a.order !== b.order) return a.order - b.order;
        return a.title.localeCompare(b.title, 'zh-Hans-CN');
      });
  }, [files]);

  const noteByPath = useCallback(
    (path: string) => notes.find((note) => note.path === path),
    [notes],
  );

  const fileText = useCallback((path: string) => files.get(path), [files]);

  const isDirty = useCallback(
    (path: string) => {
      if (deletions.includes(path)) return false;
      const base = baseFiles.get(path);
      const current = files.get(path);
      if (base === undefined) return current !== undefined;
      return current !== undefined && current !== base;
    },
    [baseFiles, deletions, files],
  );

  const updateFile = useCallback(
    (path: string, text: string) => {
      setEdits((prev) => {
        const base = baseFiles.get(path);
        const next = { ...prev };
        if (base !== undefined && base === text) delete next[path];
        else next[path] = text;
        return next;
      });
    },
    [baseFiles],
  );

  const saveNote = useCallback(
    (note: Note) => updateFile(note.path, serializeNote(note)),
    [updateFile],
  );

  const addFile = useCallback(
    (path: string, text: string) => {
      setDeletions((prev) => prev.filter((item) => item !== path));
      setEdits((prev) => ({ ...prev, [path]: text }));
    },
    [],
  );

  const deleteFile = useCallback(
    (path: string) => {
      setEdits((prev) => {
        const next = { ...prev };
        delete next[path];
        return next;
      });
      if (
        baseFiles.has(path) ||
        (snapshot?.resources ?? []).some((resource) => resource.path === path)
      ) {
        setDeletions((prev) => (prev.includes(path) ? prev : [...prev, path]));
      }
    },
    [baseFiles, snapshot],
  );

  const restoreFile = useCallback((path: string) => {
    setDeletions((prev) => prev.filter((item) => item !== path));
    setEdits((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }, []);

  const addUpload = useCallback((upload: Upload) => {
    setUploads((prev) => {
      const next = prev.filter((item) => item.path !== upload.path);
      next.push(upload);
      return next;
    });
  }, []);

  const removeUpload = useCallback((path: string) => {
    setUploads((prev) => prev.filter((item) => item.path !== path));
  }, []);

  const addMove = useCallback((move: FileMove) => {
    setMoves((prev) => {
      const next = prev.filter((item) => item.from !== move.from);
      next.push(move);
      return next;
    });
  }, []);

  const changedFiles = useMemo(() => {
    const out: { path: string; text: string; status: 'modified' | 'added' }[] = [];
    for (const [path, text] of Object.entries(edits)) {
      const base = baseFiles.get(path);
      if (base === undefined) out.push({ path, text, status: 'added' });
      else if (base !== text) out.push({ path, text, status: 'modified' });
    }
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }, [edits, baseFiles]);

  const changeCount = changedFiles.length + deletions.length + uploads.length + moves.length;

  const publish = useCallback(
    async (message: string) => {
      const result = await api.publish({
        message,
        files: changedFiles.map(({ path, text }) => ({ path, text })),
        uploads: uploads.map(({ path, base64 }) => ({ path, base64 })),
        deletions,
        moves,
      });
      setEdits({});
      setDeletions([]);
      setUploads([]);
      setMoves([]);
      try {
        const data = await api.content(true);
        setSnapshot(data);
      } catch {
        setSnapshot((prev) =>
          prev ? { ...prev, sha: result.commit.sha, loadedAt: new Date().toISOString() } : prev,
        );
      }
      return result;
    },
    [changedFiles, deletions, uploads, moves],
  );

  const resetAll = useCallback(() => {
    setEdits({});
    setDeletions([]);
    setUploads([]);
    setMoves([]);
  }, []);

  const value: WorkspaceValue = {
    snapshot,
    loading,
    error,
    notes,
    noteByPath,
    fileText,
    isDirty,
    updateFile,
    saveNote,
    addFile,
    deleteFile,
    restoreFile,
    deletions,
    uploads,
    addUpload,
    removeUpload,
    moves,
    addMove,
    changedFiles,
    changeCount,
    refresh,
    publish,
    resetAll,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace 必须在 WorkspaceProvider 内使用');
  return value;
}
