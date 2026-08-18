#!/usr/bin/env python3
"""同步 docs/knowledge/README.md 顶层索引，使其与实际文档完全一致。

用法: python3 docs/knowledge/scripts/sync-index.py
- 扫描 docs/knowledge/*/ 下的所有文档（排除 README.md）
- 逐章重建「目录」逐篇文件表（描述自动从文档标题 + 引言提取）
- 重建「知识库规模」统计（篇数 / 文档数 / 行数）
- 保留 README 中「目录」之前与「内容约定」之后的其它部分
"""
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TOP = os.path.join(ROOT, 'README.md')


def chapter_title(ch_dir):
    p = os.path.join(ROOT, ch_dir, 'README.md')
    with open(p, encoding='utf-8') as f:
        for ln in f.read().splitlines():
            m = re.match(r'^#\s+(\d{2})\s*·\s*(.+?)\s*$', ln)
            if m:
                return m.group(1), m.group(2).strip()
    return ch_dir[:2], ch_dir[3:]


def doc_desc(rel):
    p = os.path.join(ROOT, rel)
    with open(p, encoding='utf-8') as f:
        lines = f.read().splitlines()
    title = ''
    intro = ''
    for ln in lines[:14]:
        if ln.startswith('# ') and not title:
            title = ln[2:].strip()
        elif ln.startswith('>') and not intro:
            intro = ln.lstrip('> ').strip()
        if title and intro:
            break
    intro = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', intro)      # markdown 链接 -> 文字
    intro = re.sub(r'\*\*([^*]+)\*\*', r'\1', intro)            # 加粗
    intro = re.sub(r'`([^`]+)`', r'\1', intro)                   # 行内代码
    intro = re.sub(r'^\d{2}-[^：:：\s]+', '', intro)             # 开头 "01-xxx" 内部引用
    intro = re.sub(r'\s+', ' ', intro).strip()
    t = re.sub(r'^\d{2}\s*·\s*', '', title)
    if not intro:
        intro = t
    if len(intro) > 60:
        intro = intro[:60].rstrip('，。；:：、/ ') + '…'
    return t, intro


def build_catalog():
    chapters = sorted(
        d for d in os.listdir(ROOT)
        if re.match(r'^\d{2}-', d) and os.path.isdir(os.path.join(ROOT, d))
    )
    lines = []
    n_docs = 0
    n_lines = 0
    for ch in chapters:
        num, title = chapter_title(ch)
        lines.append('')
        lines.append(f'### {num} · {title}')
        lines.append('')
        lines.append('| 文档 | 内容 |')
        lines.append('|---|---|')
        files = sorted(
            p for p in os.listdir(os.path.join(ROOT, ch))
            if p.endswith('.md') and p != 'README.md'
        )
        for fname in files:
            rel = os.path.join(ch, fname)
            _, desc = doc_desc(rel)
            lines.append(f'| [{fname}]({rel}) | {desc} |')
            n_docs += 1
            with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
                n_lines += len(f.read().splitlines())
    return '\n'.join(lines), n_docs, n_lines


def main():
    with open(TOP, encoding='utf-8') as f:
        content = f.read()

    # 目录部分：从 "## 目录" 到 "## 内容约定" 之前
    start = content.index('## 目录')
    end = content.index('## 内容约定')
    catalog, n_docs, n_lines = build_catalog()

    ch_re = re.compile(r'^\d{2}-')
    n_ch = len([d for d in os.listdir(ROOT) if ch_re.match(d)])
    stats = (
        f'\n## 知识库规模\n\n'
        f'> 共 **{n_ch} 个篇章 / {n_docs} 篇文档 / 约 {n_lines:,} 行**。'
        f' 索引由 `docs/knowledge/scripts/sync-index.py` 自动生成，新增文档后请运行该脚本保持同步。\n'
    )

    new_content = content[:start] + '## 目录\n' + catalog + '\n\n' + stats + '\n' + content[end:]
    with open(TOP, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'OK: {n_ch} 篇 / {n_docs} 文档 / {n_lines} 行 已写入 {TOP}')


if __name__ == '__main__':
    main()
