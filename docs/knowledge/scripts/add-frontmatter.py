#!/usr/bin/env python3
"""为缺失 frontmatter 的知识库文档补齐 title/description。

用法: python3 docs/knowledge/scripts/add-frontmatter.py
- 扫描 docs/knowledge/*/ 下所有正文（排除 README.md 与 _assets）
- 已有 frontmatter 的跳过
- title 取第一个 `# NN · 标题`；description 取第一条 `> ` 引言（截断 90 字符）
"""
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def build_fm(path):
    with open(path, encoding='utf-8') as f:
        text = f.read()
    if text.startswith('---\n'):
        return None
    lines = text.splitlines()
    title = ''
    desc = ''
    for ln in lines[:20]:
        m = re.match(r'^#\s+(.+?)\s*$', ln)
        if m and not title:
            title = m.group(1).strip()
        elif ln.startswith('>') and not desc:
            d = ln.lstrip('> ').strip()
            d = re.sub(r'\*\*(.+?)\*\*', r'\1', d)
            if len(d) > 6:
                desc = d[:90].rstrip('，。；、') + ('…' if len(d) > 90 else '')
        if title and desc:
            break
    if not title:
        return None
    fm = f'---\ntitle: {title}\n'
    if desc:
        fm += f'description: {desc}\n'
    fm += '---\n\n'
    return fm + text


def main():
    changed = []
    for ch in sorted(os.listdir(ROOT)):
        ch_dir = os.path.join(ROOT, ch)
        if not os.path.isdir(ch_dir) or ch.startswith('_'):
            continue
        for name in sorted(os.listdir(ch_dir)):
            if not name.endswith('.md') or name == 'README.md':
                continue
            path = os.path.join(ch_dir, name)
            new = build_fm(path)
            if new:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new)
                changed.append(f'{ch}/{name}')
    print(f'已补齐 frontmatter: {len(changed)} 篇')
    for c in changed:
        print(' -', c)


if __name__ == '__main__':
    main()
