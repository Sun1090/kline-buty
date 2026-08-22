#!/usr/bin/env python3
"""校验交易知识库的硬性内容约定（双语树）。

检查项：
- zh/ 与 en/ 正文必须有含 title / description 的 frontmatter；
- zh/ 正文必须有标准「::: warning ⚠️ 风险提示」容器；en/ 正文必须有
  「::: warning ⚠️ Risk Warning」容器；
- Markdown 相对链接与图片引用目标必须存在；
- docs/knowledge/README.md 必须由 sync-index.py 生成且未过期（基于 zh/ 树）。

用法：
    python3 docs/knowledge/scripts/validate-knowledge.py
"""
from __future__ import annotations

import re
import subprocess
import sys
import urllib.parse
from os import sep as SEP
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent.parent
SCRIPT = ROOT / "scripts" / "sync-index.py"
README = ROOT / "README.md"
RISK_BY_LOCALE = {
    "zh": "::: warning ⚠️ 风险提示",
    "en": "::: warning ⚠️ Risk Warning",
}


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def locale_of(path: Path) -> str | None:
    for locale in RISK_BY_LOCALE:
        if locale in path.parts:
            return locale
    return None


def parse_frontmatter(text: str) -> dict[str, str]:
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---", 4)
    if end < 0:
        return {}
    fields: dict[str, str] = {}
    for line in text[:end].splitlines()[1:]:
        if ":" in line:
            key, value = line.split(":", 1)
            fields[key.strip()] = value.strip()
    return fields


def check_frontmatter(path: Path, text: str) -> None:
    fields = parse_frontmatter(text)
    if not fields:
        fail(f"{path}: 缺少有效 frontmatter")
    for key in ("title", "description"):
        if not fields.get(key):
            fail(f"{path}: frontmatter 缺少 {key}")


def check_risk(path: Path, text: str, locale: str) -> None:
    standard = RISK_BY_LOCALE[locale]
    if standard not in text:
        fail(f"{path}: 缺少标准「{standard}」容器")


def check_links(path: Path, text: str) -> None:
    pattern = re.compile(r"\[[^\]]+\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
    for raw_target in pattern.findall(text):
        target = raw_target.strip()
        if target.startswith(("http://", "https://", "mailto:", "/")):
            continue
        parsed = urllib.parse.urlparse(target)
        file_part = urllib.parse.unquote(parsed.path)
        if not file_part:
            continue
        resolved = path.parent / file_part
        if resolved.exists():
            continue
        # 英文版渐进翻译回退：en 树中目标未翻译时，允许指向 zh 树的同名文件
        if "en" in path.parts:
            fallback = Path(str(resolved).replace(f"{ROOT}{SEP}en{SEP}", f"{ROOT}{SEP}zh{SEP}", 1))
            if fallback.exists():
                continue
        fail(f"{path}: 引用不存在 -> {raw_target}")


def check_index() -> None:
    before = README.read_text(encoding="utf-8")
    result = subprocess.run(
        [sys.executable, str(SCRIPT)],
        cwd=REPO,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    if result.returncode != 0:
        fail(f"sync-index.py 执行失败：\n{result.stdout}")
    after = README.read_text(encoding="utf-8")
    if before != after:
        fail("docs/knowledge/README.md 索引已过期；请运行 sync-index.py")


def main() -> None:
    docs = sorted(
        path
        for locale in RISK_BY_LOCALE
        for path in (ROOT / locale).rglob("*.md")
        if path.name != "README.md"
    )
    if not docs:
        fail("docs/knowledge 下没有找到正文")

    for path in docs:
        text = path.read_text(encoding="utf-8")
        locale = locale_of(path)
        if locale is None:
            fail(f"{path}: 不在 zh/ 或 en/ 语言树下")
        check_frontmatter(path, text)
        check_risk(path, text, locale)
        check_links(path, text)

    check_index()
    print(f"OK: {len(docs)} 篇正文通过知识库完整性校验")


if __name__ == "__main__":
    main()
