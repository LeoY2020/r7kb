import { useMemo, useState } from 'react';
import {
  locateQuestionBlock,
  parseQuestionBlocks,
  serializeQuestion,
  detectKind,
} from '../lib/questions';
import { useWorkspace } from '../lib/workspace';
import type { Question } from '../lib/types';
import { Button, Empty, Field, Icon, Modal, useToast } from '../components/ui';
import QuestionModal from '../components/QuestionModal';

const KIND_LABEL = {
  single: '单选',
  multiple: '多选',
  judge: '判断',
  blank: '填空',
  text: '解答',
} as const;

type QRecord = {
  notePath: string;
  noteTitle: string;
  noteSlug: string;
  index: number;
  question: Question;
  legacy: boolean;
};

export default function QuestionsPage({ onOpenNote }: { onOpenNote: () => void }) {
  const { notes, fileText, updateFile } = useWorkspace();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | keyof typeof KIND_LABEL>('all');
  const [editing, setEditing] = useState<QRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [newNotePath, setNewNotePath] = useState('');

  const records = useMemo(() => {
    const out: QRecord[] = [];
    for (const note of notes) {
      const parsed = parseQuestionBlocks(note.body, note.slug);
      for (const item of parsed) {
        out.push({
          notePath: note.path,
          noteTitle: note.title,
          noteSlug: note.slug,
          index: item.index,
          question: item.question,
          legacy: item.legacy,
        });
      }
    }
    return out;
  }, [notes]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return records.filter((record) => {
      if (kindFilter !== 'all' && detectKind(record.question) !== kindFilter) return false;
      if (!keyword) return true;
      return (
        record.question.stem.toLowerCase().includes(keyword) ||
        record.question.answer.toLowerCase().includes(keyword) ||
        record.noteTitle.toLowerCase().includes(keyword) ||
        record.question.knowledge.some((item) => item.toLowerCase().includes(keyword))
      );
    });
  }, [records, query, kindFilter]);

  const saveQuestion = (record: QRecord, question: Question) => {
    const text = fileText(record.notePath);
    if (!text) return;
    const located = locateQuestionBlock(text, record.index);
    if (!located) {
      toast.show('找不到题目块，请刷新后重试', 'error');
      return;
    }
    const block = serializeQuestion(question, record.noteSlug, record.index);
    const next = `${text.slice(0, located.start)}${block}${text.slice(located.end)}`;
    updateFile(record.notePath, next);
    setEditing(null);
    toast.show('题目已保存，发布后进入正式题库');
  };

  const deleteQuestion = (record: QRecord) => {
    const text = fileText(record.notePath);
    if (!text) return;
    const located = locateQuestionBlock(text, record.index);
    if (!located) return;
    const next = `${text.slice(0, located.start)}${text.slice(located.end)}`.replace(/\n{3,}/g, '\n\n');
    updateFile(record.notePath, next);
    setEditing(null);
    toast.show('题目已删除');
  };

  const createQuestion = () => {
    const note = notes.find((item) => item.path === newNotePath) ?? notes[0];
    if (!note) {
      toast.show('还没有笔记，请先到知识库创建', 'error');
      return;
    }
    const text = fileText(note.path) ?? '';
    const count = parseQuestionBlocks(text, note.slug).length;
    const question: Question = {
      id: `${note.slug}-q${count + 1}`,
      difficulty: 1,
      subject: '智能电子书',
      stem: '',
      options: [],
      answer: '',
      explanation: '',
      knowledge: [],
      kind: 'text',
    };
    const block = serializeQuestion(question, note.slug, count);
    updateFile(note.path, `${text.trimEnd()}\n\n${block}\n`);
    setCreating(false);
    toast.show('已插入空白题目，请在笔记里继续编辑');
  };

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const record of records) {
      const kind = detectKind(record.question);
      map[kind] = (map[kind] ?? 0) + 1;
    }
    return map;
  }, [records]);

  return (
    <div className="list-page">
      <div className="card" style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <span className="pill">
          <Icon name="quiz" size={13} /> 共 {records.length} 道题
        </span>
        {(['single', 'multiple', 'judge', 'blank', 'text'] as const).map((kind) => (
          <span key={kind} className="pill">
            {KIND_LABEL[kind]} {counts[kind] ?? 0}
          </span>
        ))}
        <div style={{ flex: 1 }} />
        <input
          className="input input-sm"
          style={{ maxWidth: 260 }}
          placeholder="搜索题干 / 答案 / 知识点"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="select input-sm"
          style={{ width: 120 }}
          value={kindFilter}
          onChange={(event) => setKindFilter(event.target.value as typeof kindFilter)}
        >
          <option value="all">全部题型</option>
          <option value="single">单选题</option>
          <option value="multiple">多选题</option>
          <option value="judge">判断题</option>
          <option value="blank">填空题</option>
          <option value="text">解答题</option>
        </select>
        <Button size="sm" icon="plus" onClick={() => setCreating(true)}>
          新建题目
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <Empty>
            还没有题目。题目写在知识库笔记的 <code>&lt;question&gt;</code> 块里，会自动进入这里。
          </Empty>
        </div>
      ) : (
        filtered.map((record) => (
          <div
            key={`${record.notePath}-${record.index}`}
            className="q-item"
            role="button"
            tabIndex={0}
            onClick={() => setEditing(record)}
            onKeyDown={(event) => event.key === 'Enter' && setEditing(record)}
          >
            <div className="q-item-main">
              <div className="q-item-stem">{record.question.stem || '（题干为空）'}</div>
              <div className="q-item-meta">
                <span className="kind-badge">{KIND_LABEL[detectKind(record.question)]}</span>
                <span>难度 {record.question.difficulty}</span>
                <span>《{record.noteTitle}》</span>
                {record.question.knowledge.length > 0 ? (
                  <span>知识点：{record.question.knowledge.join('、')}</span>
                ) : null}
                {record.legacy ? (
                  <span style={{ color: 'rgb(var(--rose))' }}>旧写法，保存后自动升级</span>
                ) : null}
              </div>
            </div>
            <Icon name="chevronRight" size={16} />
          </div>
        ))
      )}

      {editing ? (
        <QuestionModal
          question={editing.question}
          noteSlug={editing.noteSlug}
          noteTitle={editing.noteTitle}
          onClose={() => setEditing(null)}
          onSave={(question) => saveQuestion(editing, question)}
          onDelete={() => deleteQuestion(editing)}
        />
      ) : null}

      {creating ? (
        <Modal
          title="新建题目"
          onClose={() => setCreating(false)}
          width={460}
          footer={
            <>
              <Button onClick={() => setCreating(false)}>取消</Button>
              <Button variant="primary" onClick={createQuestion}>
                插入空白题目
              </Button>
            </>
          }
        >
          <Field label="放到哪篇笔记" hint="题目会作为 <question> 块追加到笔记末尾。">
            <select
              className="select"
              value={newNotePath || notes[0]?.path || ''}
              onChange={(event) => setNewNotePath(event.target.value)}
            >
              {notes.map((note) => (
                <option key={note.path} value={note.path}>
                  {note.title}
                </option>
              ))}
            </select>
          </Field>
          <div
            style={{
              fontSize: 12.5,
              color: 'rgb(var(--ink-muted))',
              lineHeight: 1.7,
              padding: 12,
              borderRadius: 12,
              background: 'rgb(var(--ink) / 0.03)',
            }}
          >
            插入后到知识库打开这篇笔记，点击题目卡片里的「编辑题目」填写题干、选项与答案。
            <div style={{ marginTop: 8 }}>
              <Button size="sm" variant="ghost" onClick={onOpenNote}>
                去知识库
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
