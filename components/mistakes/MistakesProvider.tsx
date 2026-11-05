'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  MISTAKES_STORAGE_KEY,
  createMistakeId,
  loadStoredMistakes,
  mergeMistakes,
  normalizeMistake,
  parseMistakesJson,
  parseStoredMistakes,
  saveStoredMistakes,
  sortMistakes,
  type ImportResult,
  type Mistake,
  type MistakeInput,
} from '@/lib/mistakes';

export type MistakesContextValue = {
  mistakes: Mistake[];
  /** 首屏水合完成前为 false，避免 SSR mismatch 与空状态闪烁 */
  hydrated: boolean;
  /** localStorage 写入失败时的提示（例如隐私模式） */
  storageError: string | null;
  addMistake: (input: MistakeInput) => Mistake;
  updateMistake: (id: string, patch: MistakeInput) => void;
  removeMistake: (id: string) => void;
  toggleMastered: (id: string, next?: boolean) => void;
  clearMistakes: () => void;
  /** 兼容旧入口：直接导入 JSON 文本 */
  importMistakes: (text: string) => ImportResult;
  /** 图形化导入：导入已解析（并可能被用户勾选过滤）的错题列表 */
  importParsedMistakes: (items: Mistake[]) => ImportResult;
};

const MistakesContext = createContext<MistakesContextValue | null>(null);

function buildMistake(input: MistakeInput): Mistake {
  const normalized = normalizeMistake({
    ...input,
    id: createMistakeId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  // normalizeMistake 只在题干为空时返回 null；表单已校验，这里仍留一道兜底。
  if (normalized) return normalized;
  return {
    id: createMistakeId(),
    stem: input.stem.trim() || '（未填写题干）',
    createdAt: new Date().toISOString(),
    mastered: false,
  };
}

/**
 * 错题本数据 Provider：读写 localStorage、跨标签页同步、增删改导入。
 * 在 `/mistakes/` 页面与知识库题目块处局部包裹即可，不要放进 app/layout.tsx。
 */
export function MistakesProvider({ children }: { children: ReactNode }) {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  /** 上一次写入/读到的序列化值，避免 storage 事件回写造成跨标签页回声 */
  const lastSerialized = useRef<string>('');

  // 首屏读取 localStorage（只在客户端执行），避免 SSR mismatch
  useEffect(() => {
    const stored = loadStoredMistakes();
    lastSerialized.current = JSON.stringify(stored);
    setMistakes(stored);
    setHydrated(true);
  }, []);

  // 状态变化后持久化；hydrated 之前绝不写入，防止空数组覆盖已有数据
  useEffect(() => {
    if (!hydrated) return;
    const serialized = JSON.stringify(mistakes);
    if (serialized === lastSerialized.current) return;
    const ok = saveStoredMistakes(mistakes);
    if (ok) {
      lastSerialized.current = serialized;
      setStorageError(null);
    } else {
      setStorageError('无法写入本地存储：可能是浏览器隐私模式或空间已满。');
    }
  }, [mistakes, hydrated]);

  // 跨标签页同步
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== MISTAKES_STORAGE_KEY) return;
      const next = parseStoredMistakes(event.newValue);
      lastSerialized.current = event.newValue ?? JSON.stringify(next);
      setMistakes(next);
      setHydrated(true);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addMistake = useCallback((input: MistakeInput): Mistake => {
    const mistake = buildMistake(input);
    setMistakes((prev) => sortMistakes([mistake, ...prev]));
    return mistake;
  }, []);

  const updateMistake = useCallback((id: string, patch: MistakeInput) => {
    setMistakes((prev) =>
      sortMistakes(
        prev.map((item) => {
          if (item.id !== id) return item;
          const next = normalizeMistake({
            ...item,
            ...patch,
            id: item.id,
            createdAt: item.createdAt,
            updatedAt: new Date().toISOString(),
          });
          return next ?? item;
        })
      )
    );
  }, []);

  const removeMistake = useCallback((id: string) => {
    setMistakes((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleMastered = useCallback((id: string, next?: boolean) => {
    setMistakes((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          mastered: typeof next === 'boolean' ? next : !item.mastered,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const clearMistakes = useCallback(() => {
    setMistakes([]);
  }, []);

  const importMistakes = useCallback(
    (text: string): ImportResult => {
      const parsed = parseMistakesJson(text);
      if (parsed.error) {
        return { added: 0, duplicates: 0, invalid: parsed.invalid, total: 0, error: parsed.error };
      }
      const merged = mergeMistakes(mistakes, parsed.items);
      if (merged.added > 0) setMistakes(merged.mistakes);
      return {
        added: merged.added,
        duplicates: merged.duplicates,
        invalid: parsed.invalid,
        total: parsed.items.length,
      };
    },
    [mistakes]
  );

  const importParsedMistakes = useCallback(
    (items: Mistake[]): ImportResult => {
      const merged = mergeMistakes(mistakes, items);
      if (merged.added > 0) setMistakes(merged.mistakes);
      return {
        added: merged.added,
        duplicates: merged.duplicates,
        invalid: 0,
        total: items.length,
      };
    },
    [mistakes]
  );

  const value = useMemo<MistakesContextValue>(
    () => ({
      mistakes,
      hydrated,
      storageError,
      addMistake,
      updateMistake,
      removeMistake,
      toggleMastered,
      clearMistakes,
      importMistakes,
      importParsedMistakes,
    }),
    [
      mistakes,
      hydrated,
      storageError,
      addMistake,
      updateMistake,
      removeMistake,
      toggleMastered,
      clearMistakes,
      importMistakes,
      importParsedMistakes,
    ]
  );

  return <MistakesContext.Provider value={value}>{children}</MistakesContext.Provider>;
}

/** 必须在 MistakesProvider 内使用 */
export function useMistakes(): MistakesContextValue {
  const context = useContext(MistakesContext);
  if (!context) {
    throw new Error('useMistakes 必须在 <MistakesProvider> 内使用。');
  }
  return context;
}

/** 可选使用：知识库题目块在无 Provider 时仍能渲染 */
export function useMistakesOptional(): MistakesContextValue | null {
  return useContext(MistakesContext);
}

export default MistakesProvider;
