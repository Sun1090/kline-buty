#!/usr/bin/env python3
"""同步 docs/knowledge/README.md 顶层索引，使其与 zh/ 树实际文档完全一致。

用法: python3 docs/knowledge/scripts/sync-index.py
- 扫描 docs/knowledge/zh/<slug>/ 下的所有文档（排除 README.md）
- 逐章重建「目录」逐篇文件表（描述自动从文档标题 + 引言提取）
- 重建「知识库规模」统计（章数 / 篇数 / 行数）
- 保留 README 中「目录」之前与「内容约定」之后的其它部分
"""
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ZH = os.path.join(ROOT, 'zh')
TOP = os.path.join(ROOT, 'README.md')

# 章节显示顺序 = 目录名去掉数字前缀前的原始阅读序（与 config.mjs CHAPTER_ORDER 一致）
CHAPTER_ORDER = [
    'getting-started', 'spot', 'futures', 'stocks', 'crypto-perpetuals',
    'technical-analysis', 'trading-system', 'pitfalls', 'markets-instruments',
    'system-integration', 'trading-practice', 'market-ecosystem',
    'financial-history', 'wealth-allocation', 'quant-practice',
    'regulation-compliance', 'tools-platforms', 'financial-statements',
    'industry-research', 'reading-list', 'behavioral-finance', 'bonds-rates',
    'forex-trading', 'career', 'global-markets', 'data-interpretation',
    'options-strategies',
]


def chapter_title(ch_dir):
    p = os.path.join(ZH, ch_dir, 'README.md')
    with open(p, encoding='utf-8') as f:
        for ln in f.read().splitlines():
            m = re.match(r'^#\s+(\d{2})\s*·\s*(.+?)\s*$', ln)
            if m:
                return m.group(1), m.group(2).strip()
    return '??', ch_dir


def doc_desc(rel):
    p = os.path.join(ZH, rel)
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
    intro = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', intro)
    intro = re.sub(r'\*\*([^*]+)\*\*', r'\1', intro)
    intro = re.sub(r'`([^`]+)`', r'\1', intro)
    intro = re.sub(r'^\d{2}-[^：:：\s]+', '', intro)
    intro = re.sub(r'\s+', ' ', intro).strip()
    t = re.sub(r'^\d{2}\s*·\s*', '', title)
    if not intro:
        intro = t
    if len(intro) > 60:
        intro = intro[:60].rstrip('，。；:：、/ ') + '…'
    return t, intro


def build_catalog():
    chapters = [d for d in CHAPTER_ORDER if os.path.isdir(os.path.join(ZH, d))]
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
            p for p in os.listdir(os.path.join(ZH, ch))
            if p.endswith('.md') and p != 'README.md'
        )
        # 按正文 H1 的「NN ·」序号排序；无编号退回文件名序
        def doc_no(fname):
            with open(os.path.join(ZH, ch, fname), encoding='utf-8') as f:
                m = re.search(r'^# (\d{1,2})\s*·', f.read(), re.M)
            return int(m.group(1)) if m else 999
        files.sort(key=lambda f: (doc_no(f), f))
        for fname in files:
            rel = os.path.join(ch, fname)
            _, desc = doc_desc(rel)
            lines.append(f'| [{fname}](zh/{rel}) | {desc} |')
            n_docs += 1
            with open(os.path.join(ZH, rel), encoding='utf-8') as f:
                n_lines += len(f.read().splitlines())
    return '\n'.join(lines), len(chapters), n_docs, n_lines


def main():
    with open(TOP, encoding='utf-8') as f:
        content = f.read()

    start = content.index('## 目录')
    end = content.index('## 内容约定')
    catalog, n_ch, n_docs, n_lines = build_catalog()

    stats = (
        f'\n## 知识库规模\n\n'
        f'> 共 **{n_ch} 个篇章 / {n_docs} 篇文档 / 约 {n_lines:,} 行**（zh 全量；英文版持续翻译中）。'
        f' 索引由 `docs/knowledge/scripts/sync-index.py` 自动生成，新增文档后请运行该脚本保持同步。\n'
    )

    new_content = content[:start] + '## 目录\n' + catalog + '\n\n' + stats + '\n' + content[end:]
    with open(TOP, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'OK: {n_ch} 章 / {n_docs} 篇 / {n_lines} 行 已写入 {TOP}')


if __name__ == '__main__':
    main()
