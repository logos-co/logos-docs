#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Deterministic Markdown → JSON transformer (generic, rule-aware) — v16

Key fixes:
- After an <!-- EXAMPLE: RULE-ID --> marker, only capture bullets/paragraphs that are indented
  more than the marker line (prevents swallowing subsequent top-level rules).
- Ignore the "Examples:" bullet that only contains the EXAMPLE marker (avoid duplicate example entry).
- Merge & dedupe examples captured by the two strategies.
- Keep Option A: rule/section mapping tables become arrays of row objects.

This script supports a --parse-only mode that emits <output>.hints.json.
"""

import os, sys, re, json, time, hashlib, argparse
from typing import Dict, List, Tuple, Union, Any
import requests

COMMENT_GROUP = re.compile(r'<!--\s*group:\s*([A-Z0-9]+(?:-[A-Z0-9]+)+)\s*-->')
COMMENT_ID = re.compile(r'<!--\s*([A-Z0-9]+(?:-[A-Z0-9]+)+)\s*-->')
EXAMPLE_MARKER = re.compile(r'<!--\s*EXAMPLE\s*:\s*([A-Z0-9]+(?:-[A-Z0-9]+)+)\s*-->')
FRONTMATTER = re.compile(r"^---\n(.*?)\n---", re.DOTALL | re.MULTILINE)
HEADING = re.compile(r'^\s*(#{1,6})\s+(.*?)\s*$')
ALIGN_ROW = re.compile(r'^\|\s*:?-')
CODE_FENCE = re.compile(r'^\s*```')
EXAMPLES_ANCHOR = re.compile(r'^\s*(?:Examples?|For example)\s*:?\s*$', re.IGNORECASE)
USE_INSTEAD_PAT = re.compile(r'(?i)\buse\s+(.+?)\s+instead\s+of\s+(.+?)[\.\!"]?$')

def read_text(p): 
    with open(p, "r", encoding="utf-8") as f: 
        return f.read()

def write_text(p, t):
    with open(p, "w", encoding="utf-8") as f:
        f.write(t)

def sha256(text: str) -> str:
    import hashlib
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def strip_json_fence(s: str) -> str:
    s2 = s.strip()
    if s2.startswith("```"):
        i = s2.find("\n")
        j = s2.rfind("```")
        if i != -1 and j != -1 and j > i:
            return s2[i + 1 : j].strip()
    return s2

def parse_frontmatter_keys(md: str) -> List[str]:
    m = FRONTMATTER.search(md)
    if not m:
        return []
    keys = []
    for line in m.group(1).splitlines():
        ls = line.strip()
        if not ls or ls.startswith("#"):
            continue
        if ":" in ls:
            keys.append(ls.split(":", 1)[0].strip())
    return keys

def parse_section_table(md: str) -> List[Dict[str, str]]:
    lines = md.splitlines()
    table_lines, in_table = [], False
    for line in lines:
        if line.strip().startswith("|"):
            table_lines.append(line.rstrip())
            in_table = True
            continue
        if in_table:
            if not line.strip().startswith("|"):
                break
            table_lines.append(line.rstrip())
    rows = [r for r in table_lines if not ALIGN_ROW.match(r)]
    if not rows:
        return []
    def cells(r: str) -> List[str]:
        return [c.strip() for c in r.strip("|").split("|")]
    data = [cells(r) for r in rows[1:]]
    out = []
    for cols in data:
        if len(cols) < 4:
            continue
        title, fmt, req, id_cell = cols[:4]
        m = re.search(r'`([A-Z0-9]+(?:-[A-Z0-9]+)+)`', id_cell)
        sid = m.group(1) if m else id_cell.strip()
        out.append({"id": sid, "title": title, "required": req, "format": fmt or ""})
    return out

def extract_rule_ids_exact(md: str) -> List[str]:
    ids = []
    for m in COMMENT_ID.finditer(md):
        token = m.group(1)
        line_start = md.rfind("\n", 0, m.start())
        line_end = md.find("\n", m.end())
        line_start = 0 if line_start == -1 else line_start + 1
        line_end = len(md) if line_end == -1 else line_end
        line = md[line_start:line_end]
        if "group:" in line:
            continue
        if HEADING.match(line):
            continue
        ids.append(token)
    return ids

def parse_section_positions(md: str) -> List[Dict[str, int]]:
    lines = md.splitlines()
    positions = []
    for idx, line in enumerate(lines):
        if not HEADING.match(line):
            continue
        sid = None
        mg = COMMENT_GROUP.search(line)
        if mg:
            sid = mg.group(1)
        else:
            mi = COMMENT_ID.search(line)
            if mi:
                sid = mi.group(1)
        if sid:
            positions.append({"id": sid, "start": idx})
    for i in range(len(positions)):
        positions[i]["end"] = positions[i + 1]["start"] if i < len(positions) - 1 else len(lines)
    return positions

def _collect_blockquote(block: List[str], j: int) -> Tuple[str, int]:
    parts = []
    while j < len(block):
        ln = block[j]
        if ln.lstrip().startswith(">"):
            stripped = re.sub(r'^\s*>\s?', '', ln).rstrip()
            parts.append(stripped)
            j += 1
        else:
            break
    text = " ".join(p for p in parts if p)
    text = re.sub(r'\s+', ' ', text).strip()
    return text, j

def _collect_code_fence(block: List[str], j: int) -> Tuple[str, int]:
    lang = ""
    first = block[j].rstrip()
    m = re.match(r'^\s*```(\S+)?', first)
    if m and m.group(1):
        lang = m.group(1)
    j += 1
    code_lines = []
    while j < len(block) and not re.match(r'^\s*```', block[j]):
        code_lines.append(block[j].rstrip("\n"))
        j += 1
    if j < len(block):
        j += 1
    code = "\n".join(code_lines)
    snippet = f"```{lang}\n{code}\n```".strip()
    return snippet, j

def _collect_paragraph(block: List[str], j: int) -> Tuple[str, int]:
    parts = []
    while j < len(block):
        ln = block[j]
        if not ln.strip():
            j += 1
            break
        if re.match(r'^\s*#', ln) or ln.lstrip().startswith(">") or re.match(r'^\s*```', ln) or re.match(r'^\s*-\s+', ln):
            break
        parts.append(ln.strip())
        j += 1
    text = " ".join(parts)
    text = re.sub(r'\s+', ' ', text).strip()
    return text, j

def _collect_bullets(block: List[str], j: int) -> Tuple[List[str], int]:
    items = []
    while j < len(block) and re.match(r'^\s*-\s+', block[j]):
        item = re.sub(r'^\s*-\s+', '', block[j]).rstrip()
        j += 1
        while j < len(block) and (block[j].startswith("  ") or block[j].startswith("\t")) and not re.match(r'^\s*-\s+', block[j]):
            cont = block[j].strip()
            if cont:
                item = f"{item} {cont}"
            j += 1
        item = re.sub(r'\s+', ' ', item).strip()
        if item:
            items.append(item)
    return items, j

def _collect_bullets_min_indent(block: List[str], j: int, min_indent: int) -> Tuple[List[str], int]:
    def indent_len(s: str) -> int:
        i = 0
        while i < len(s) and s[i] in (" ", "\t"):
            i += 1
        return i
    items = []
    while j < len(block):
        ln = block[j]
        if not re.match(r'^\s*-\s+', ln):
            break
        if indent_len(ln) <= min_indent:
            break
        item = re.sub(r'^\s*-\s+', '', ln).rstrip()
        j += 1
        this_indent = indent_len(ln)
        while j < len(block):
            ln2 = block[j]
            if re.match(r'^\s*-\s+', ln2):
                if indent_len(ln2) <= min_indent:
                    break
                else:
                    break
            if indent_len(ln2) > this_indent:
                cont = ln2.strip()
                if cont:
                    item = f"{item} {cont}"
                j += 1
            else:
                break
        item = re.sub(r'\s+', ' ', item).strip()
        if item:
            items.append(item)
    return items, j

def _collect_table_rows(block: List[str], j: int) -> Tuple[List[List[str]], int]:
    if j >= len(block) or not block[j].strip().startswith("|"):
        return [], j
    lines = []
    lines.append(block[j].rstrip())
    j += 1
    if j < len(block) and re.match(r'^\|\s*:?-', block[j].strip()):
        lines.append(block[j].rstrip())
        j += 1
    while j < len(block) and block[j].strip().startswith("|"):
        lines.append(block[j].rstrip())
        j += 1
    rows = []
    for ln in lines:
        if re.match(r'^\|\s*:?-', ln.strip()):
            continue
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        rows.append(cells)
    return rows, j

def _clean_header_key(s: str) -> str:
    s = re.sub(r'[`*_]+', '', s).strip().strip(":").strip()
    return s or "col"

def _rows_to_row_objects(rows: List[List[str]]) -> List[Dict[str, str]]:
    if not rows:
        return []
    if len(rows) >= 2:
        headers = [_clean_header_key(h) or f"col{i+1}" for i, h in enumerate(rows[0])]
        body = rows[1:]
    else:
        headers = [f"col{i+1}" for i in range(len(rows[0]))]
        body = rows
    objects = []
    for r in body:
        obj = {}
        for i, v in enumerate(r):
            key = headers[i] if i < len(headers) else f"col{i+1}"
            obj[key] = re.sub(r'\s+', ' ', v).strip()
        objects.append(obj)
    return objects

def _strip_lead_examples_label(s: str) -> str:
    return re.sub(r'^(?:examples?|for example)\s*:?\s*', '', s, flags=re.IGNORECASE).strip()

def _normalize_whitespace(s: str) -> str:
    return re.sub(r'\s+', ' ', s).strip()

def _mapping_table_after(lines: List[str], start_index: int) -> List[Dict[str, str]]:
    i = start_index
    n = len(lines)
    while i < n and not lines[i].strip():
        i += 1
    if i + 1 >= n:
        return []
    if not lines[i].strip().startswith("|"):
        return []
    if not re.match(r'^\|\s*:?-', lines[i + 1].strip()):
        return []
    rows, _ = _collect_table_rows(lines, i)
    if not rows:
        return []
    return _rows_to_row_objects(rows)

def _collect_indented_examples(lines: List[str], start_index: int) -> List[str]:
    i = start_index
    n = len(lines)
    out: List[str] = []
    while i < n and (lines[i].startswith(" ") or lines[i].startswith("\t")):
        s = lines[i]
        if re.match(r'^[ \t]+\-\s+', s):
            item = re.sub(r'^[ \t]+-\s+', '', s).strip()
            if item:
                stripped = _strip_lead_examples_label(item)
                # If this bullet is only the EXAMPLE marker, skip it
                if EXAMPLE_MARKER.search(stripped) and stripped.strip().startswith("<!--"):
                    item = ""
                else:
                    m = USE_INSTEAD_PAT.search(stripped)
                    if m:
                        good, bad = m.group(1).strip(), m.group(2).strip()
                        out.append(f"Bad: {bad}")
                        out.append(f"Good: {good}")
                    else:
                        out.append(stripped)
            i += 1
            while i < n and (lines[i].startswith("  ") or lines[i].startswith("\t")) and not re.match(r'^[ \t]+\-\s+', lines[i]):
                cont = lines[i].strip()
                if cont:
                    if out:
                        out[-1] = f"{out[-1]} {cont}"
                    else:
                        out.append(cont)
                i += 1
            continue
        m_anchor = re.match(r'^[ \t]*(?:examples?|for example)\s*:?\s*(.*)$', s, flags=re.IGNORECASE)
        if m_anchor:
            tail = m_anchor.group(1).strip()
            if tail:
                out.append(tail)
            i += 1
            while i < n and (lines[i].startswith("  ") or lines[i].startswith("\t")) and not re.match(r'^[ \t]+\-\s+', lines[i]):
                cont = lines[i].strip()
                if cont:
                    if out:
                        out[-1] = f"{out[-1]} {cont}"
                    else:
                        out.append(cont)
                i += 1
            continue
        if not lines[i].strip():
            break
        if re.match(r'^\s*#', lines[i]) or re.match(r'^\s*```', lines[i]) or lines[i].lstrip().startswith(">"):
            break
        i += 1
    cleaned = []
    for x in out:
        x2 = re.sub(r'<!--.*?-->', '', x).strip()
        if x2:
            cleaned.append(_normalize_whitespace(x2))
    return cleaned

def _leading_indent(s: str) -> int:
    i = 0
    while i < len(s) and s[i] in (" ", "\t"):
        i += 1
    return i

def build_examples_hint(md: str) -> Dict[str, List[Any]]:
    lines = md.splitlines()
    out: Dict[str, List[Any]] = {}

    # Strategy 1: immediately following the rule
    for idx, line in enumerate(lines):
        m = COMMENT_ID.search(line)
        if not m: 
            continue
        if "group:" in line:
            continue
        if HEADING.match(line):
            continue
        rid = m.group(1)
        bullets_or_para = _collect_indented_examples(lines, idx + 1)
        table_examples = _mapping_table_after(lines, idx + 1)
        exs: List[Any] = []
        if bullets_or_para:
            exs.extend(bullets_or_para)
        if table_examples:
            exs.extend(table_examples)
        if exs:
            out.setdefault(rid, [])
            seen = set(json.dumps(it, ensure_ascii=False, sort_keys=True) if isinstance(it, dict) else it for it in out[rid])
            for e in exs:
                key = json.dumps(e, ensure_ascii=False, sort_keys=True) if isinstance(e, dict) else e
                if key not in seen:
                    out[rid].append(e)
                    seen.add(key)

    # Strategy 2: explicit EXAMPLE markers
    n = len(lines)
    i = 0
    while i < n:
        line = lines[i]
        m = EXAMPLE_MARKER.search(line)
        if not m:
            i += 1
            continue
        rid = m.group(1)
        marker_indent = _leading_indent(line)
        j = i + 1
        while j < n and not lines[j].strip():
            j += 1
        block = lines[j:]
        captured: List[Any] = []
        if j < n and block:
            if block[0].lstrip().startswith(">"):
                ex, adv = _collect_blockquote(block, 0); j += adv
                if ex: captured.append(ex)
            elif re.match(r'^\s*```', block[0]):
                ex, adv = _collect_code_fence(block, 0); j += adv
                if ex: captured.append(ex)
            elif block[0].strip().startswith("|"):
                rows, adv = _collect_table_rows(block, 0); j += adv
                if rows: captured.extend(_rows_to_row_objects(rows))
            elif re.match(r'^\s*-\s+', block[0]) and _leading_indent(block[0]) > marker_indent:
                items, adv = _collect_bullets_min_indent(block, 0, marker_indent); j += adv
                captured.extend(items)
            elif _leading_indent(block[0]) > marker_indent:
                ex, adv = _collect_paragraph(block, 0); j += adv
                if ex: captured.append(ex)
            else:
                j = i + 1  # nothing valid captured
        if captured:
            out.setdefault(rid, [])
            seen = set(json.dumps(it, ensure_ascii=False, sort_keys=True) if isinstance(it, dict) else it for it in out[rid])
            for item in captured:
                key = json.dumps(item, ensure_ascii=False, sort_keys=True) if isinstance(item, dict) else item
                if key not in seen:
                    out[rid].append(item)
                    seen.add(key)
        i = j if j > i else i + 1
    return out

def build_section_examples_hint(md: str) -> Dict[str, List[Union[str, Dict[str, str]]]]:
    lines = md.splitlines()
    positions = parse_section_positions(md)
    out: Dict[str, List[Union[str, Dict[str, str]]]] = {}
    for pos in positions:
        sid = pos["id"]
        start, end = pos["start"], pos["end"]
        block = lines[start:end]
        examples: List[Union[str, Dict[str, str]]] = []
        i = 0
        while i < len(block):
            ln = block[i]
            if EXAMPLES_ANCHOR.match(ln) and not re.match(r'^\s*-\s+', ln):
                j = i + 1
                while j < len(block) and not block[j].strip():
                    j += 1
                if j < len(block) and block[j].lstrip().startswith(">"):
                    ex, j = _collect_blockquote(block, j); 
                    if ex: examples.append(ex)
                elif j < len(block) and re.match(r'^\s*```', block[j]):
                    ex, j = _collect_code_fence(block, j);
                    if ex: examples.append(ex)
                elif j < len(block) and re.match(r'^\s*-\s+', block[j]):
                    items, j = _collect_bullets(block, j); 
                    examples.extend(items)
                elif j < len(block) and block[j].strip().startswith("|"):
                    rows, j = _collect_table_rows(block, j);
                    if rows: examples.extend(_rows_to_row_objects(rows))
                else:
                    ex, j = _collect_paragraph(block, j);
                    if ex: examples.append(ex)
                i = j
                continue
            i += 1
        if examples:
            normalized = [ _normalize_whitespace(x) if isinstance(x, str) else x for x in examples ]
            out[sid] = normalized
    return out

def detect_backend():
    backend = os.environ.get("LLM_BACKEND", "openai").lower()
    model = os.environ.get("MODEL")
    if not model:
        print("Missing MODEL", file=sys.stderr); sys.exit(2)
    if backend == "openai":
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            print("Missing OPENAI_API_KEY", file=sys.stderr); sys.exit(2)
        base = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
        url = base.rstrip("/") + "/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    elif backend == "openrouter":
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            print("Missing OPENROUTER_API_KEY", file=sys.stderr); sys.exit(2)
        base = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        url = base.rstrip("/") + "/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    else:
        print("LLM_BACKEND must be 'openai' or 'openrouter'", file=sys.stderr); sys.exit(2)
    return model, url, headers

def build_messages(prompt: str, markdown: str, hints: Dict) -> List[Dict]:
    system_msg = {"role": "system", "content": "You convert Markdown into JSON strictly per the provided instructions. Do not invent fields. Preserve every UPPERCASE rule id verbatim. Use provided hints exactly."}
    return [
        system_msg,
        {"role": "user", "content": prompt},
        {"role": "user", "content": "Here is the Markdown to convert:\n\n```markdown\n" + markdown + "\n```"},
        {"role": "user", "content": "Authoritative hints (use; do not echo):\n\n```json\n" + json.dumps(hints, ensure_ascii=False, indent=2) + "\n```"},
    ]

def post_chat(url: str, headers: Dict, payload: Dict):
    return requests.post(url, headers=headers, json=payload, timeout=600)

def retryable_post(url: str, headers: Dict, payload: Dict, attempts: int = 3):
    last = None
    for i in range(attempts):
        resp = post_chat(url, headers, payload)
        if resp.status_code == 200:
            return resp
        if resp.status_code == 400 and "unsupported_value" in resp.text:
            for k in ("temperature", "top_p", "presence_penalty", "frequency_penalty"):
                payload.pop(k, None)
            last = resp; continue
        if resp.status_code >= 500 or resp.status_code in (408, 429):
            import time; time.sleep(1.5 * (i + 1)); last = resp; continue
        last = resp; break
    return last if last is not None else resp

def _collect_json_ids(obj: Dict) -> Tuple[List[str], List[str]]:
    sections, rules = [], []
    for s in obj.get("sections", []) or []:
        sid = s.get("id"); 
        if isinstance(sid, str): sections.append(sid)
        for r in s.get("rules", []) or []:
            rid = r.get("id"); 
            if isinstance(rid, str): rules.append(rid)
    for blk in obj.get("forbidden", []) or []:
        for r in blk.get("rules", []) or []:
            rid = r.get("id")
            if isinstance(rid, str): rules.append(rid)
    return sections, rules

def _expected_rule_ids_with_dups(rule_ids_exact: List[str]) -> List[str]:
    counts, out = {}, []
    for rid in rule_ids_exact:
        c = counts.get(rid, 0); out.append(rid if c == 0 else f"{rid}-DUP-{c}"); counts[rid] = c + 1
    return out

def _sections_table_mismatches(obj: Dict, sections_table: List[Dict[str, str]]) -> List[Dict]:
    want_by_id = {s["id"]: s for s in sections_table}
    got_by_id = {s.get("id"): s for s in obj.get("sections", []) or []}
    mismatches = []
    for sid, want in want_by_id.items():
        got = got_by_id.get(sid)
        if not got:
            mismatches.append({"type": "section_missing_in_json", "id": sid}); continue
        if (got.get("title") or "") != (want["title"] or ""):
            mismatches.append({"type": "title_mismatch", "id": sid, "want": want["title"], "got": got.get("title")})
        got_req = got.get("required")
        got_req_norm = {"required": "Yes", "optional": "No", "forbidden": "Forbidden"}.get(got_req, got_req)
        if got_req_norm != want["required"]:
            mismatches.append({"type": "required_mismatch", "id": sid, "want": want["required"], "got": got_req})
        if (got.get("format") or "") != (want.get("format") or ""):
            mismatches.append({"type": "format_mismatch", "id": sid, "want": want.get("format", ""), "got": got.get("format", "")})
    return mismatches

def write_rules_sidecar(base_out: str, md: str, obj: Dict, examples_hint: Dict[str, List[Any]], section_examples_hint: Dict[str, List[Union[str, Dict[str, str]]]]) -> None:
    sections_table = parse_section_table(md)
    section_ids_from_table = [s["id"] for s in sections_table]
    rule_ids_exact = extract_rule_ids_exact(md)

    json_section_ids, json_rule_ids = _collect_json_ids(obj)
    expected_rule_ids = _expected_rule_ids_with_dups(rule_ids_exact)

    missing_sections = sorted(set(section_ids_from_table) - set(json_section_ids))
    extra_sections = sorted(set(json_section_ids) - set(section_ids_from_table))

    missing_rules = [rid for rid in expected_rule_ids if rid not in json_rule_ids]
    extra_rules = [rid for rid in json_rule_ids if rid not in expected_rule_ids]

    section_has_group = []
    desc_leaks, expected_examples_missing = [], []
    leak_pat = re.compile(r"\b(for example|e\.g\.|instead of|rather than)\b", re.IGNORECASE)

    sid_to_section = {s.get("id"): s for s in obj.get("sections", []) or []}
    for sid, sec in sid_to_section.items():
        if isinstance(sec, dict) and "group" in sec:
            section_has_group.append(sid)
        sec_ex = sec.get("examples", []) or []
        hint_ex = section_examples_hint.get(sid, [])
        # intentionally allow empty sec_ex
        for r in sec.get("rules", []) or []:
            rid = r.get("id", "")
            desc = r.get("description", "") or ""
            exs = r.get("examples", []) or []
            if leak_pat.search(desc):
                desc_leaks.append(rid)
            if examples_hint.get(rid) and not exs:
                expected_examples_missing.append(rid)

    report = {
        "sections": {
            "expected_from_table": section_ids_from_table,
            "json_section_ids": json_section_ids,
            "missing_in_json": missing_sections,
            "extra_in_json": extra_sections,
            "table_mismatches": _sections_table_mismatches(obj, sections_table),
        },
        "rules": {
            "expected_from_rule_ids_exact": expected_rule_ids,
            "json_rule_ids": json_rule_ids,
            "missing_in_json": missing_rules,
            "extra_in_json": extra_rules,
        },
        "examples": {
            "from_rule_hints_nonempty": sorted([k for k, v in examples_hint.items() if v]),
            "from_section_hints_nonempty": sorted([k for k, v in section_examples_hint.items() if v]),
            "schema_section_has_group": section_has_group,
            "description_leaks_examples": desc_leaks,
            "rules_expected_examples_missing": expected_examples_missing,
        }
    }
    write_text(base_out + ".rules-check.json", json.dumps(report, ensure_ascii=False, indent=2))

def write_meta_sidecar(base_out: str, meta: Dict) -> None:
    write_text(base_out + ".meta.json", json.dumps(meta, ensure_ascii=False, indent=2))

def apply_hints_to_obj(obj: Dict, section_examples_hint: Dict[str, List[Union[str, Dict[str, str]]]], rule_examples_hint: Dict[str, List[Any]]) -> Dict:
    if not isinstance(obj, dict):
        return obj
    sections = obj.get("sections")
    if isinstance(sections, list):
        for sec in sections:
            if not isinstance(sec, dict):
                continue
            if "group" in sec:
                sec.pop("group", None)
            sid = sec.get("id")
            if isinstance(sid, str) and sid in section_examples_hint:
                sec["examples"] = list(section_examples_hint[sid])
            for r in sec.get("rules", []) or []:
                rid = r.get("id")
                if isinstance(rid, str) and rid in rule_examples_hint:
                    r["examples"] = list(rule_examples_hint[rid])
    return obj

def main():
    ap = argparse.ArgumentParser(description="Deterministic Markdown→JSON transformer — v16")
    ap.add_argument("input_md", help="Path to input Markdown file")
    ap.add_argument("output_json", help="Path to output JSON file")
    ap.add_argument("--prompt", dest="prompt_path", help="Path to prompt.md")
    ap.add_argument("--parse-only", action="store_true", help="Only parse and emit <output>.hints.json; skip API call.")
    args = ap.parse_args()

    prompt_path = os.environ.get("PROMPT_PATH") or args.prompt_path or os.path.join(os.path.dirname(__file__), "prompt.md")
    if not os.path.exists(prompt_path):
        print(f"Missing prompt file: {prompt_path}", file=sys.stderr); sys.exit(2)

    prompt = read_text(prompt_path)
    markdown = read_text(args.input_md)
    md_hash = sha256(markdown)

    fm_keys = parse_frontmatter_keys(markdown)
    sections_table = parse_section_table(markdown)
    section_ids_from_table = [s["id"] for s in sections_table]
    rule_ids_exact = extract_rule_ids_exact(markdown)

    rule_examples_hint = build_examples_hint(markdown)
    section_examples_hint = build_section_examples_hint(markdown)

    hints = {
        "md_sha256": md_hash,
        "front_matter_keys": fm_keys,
        "sections_table": sections_table,
        "section_ids_from_table": section_ids_from_table,
        "rule_ids_exact": rule_ids_exact,
        "examples_hint": rule_examples_hint,
        "section_examples_hint": section_examples_hint,
        "notes": [
            "Sections must NOT have a 'group' field; only rules carry 'group'.",
            "Use rule_ids_exact as the authoritative list of rule IDs to emit; include -DUP-n for repeats.",
            "If examples_hint[ID] exists, set rule.examples from it. Items may be strings or objects (for tables via EXAMPLE markers).",
            "If section_examples_hint[SID] exists, set sections[i].examples from it (items may be strings or objects).",
            "Do not invent rule IDs; synthesize AUTO IDs only for rule lines missing an ID."
        ],
    }

    if args.parse_only:
        write_text(args.output_json + ".hints.json", json.dumps(hints, ensure_ascii=False, indent=2))
        print("Parse-only: wrote", args.output_json + ".hints.json")
        return

    model, url, headers = detect_backend()
    messages = build_messages(prompt, markdown, hints)
    payload = {
        "model": model,
        "response_format": {"type": "json_object"},
        "messages": messages,
        "seed": int(os.environ.get("SEED", "1234")),
    }
    if os.environ.get("ALLOW_SAMPLING_PARAMS", "0") == "1" and "gpt-5" not in os.environ.get("MODEL", ""):
        for k in ("TEMPERATURE", "TOP_P", "PRESENCE_PENALTY", "FREQUENCY_PENALTY"):
            if k in os.environ:
                payload[k.lower()] = float(os.environ[k])

    resp = retryable_post(url, headers, payload, attempts=3)
    if not resp or resp.status_code != 200:
        status = resp.status_code if resp else "no_response"
        body = (resp.text[:1400] if resp and hasattr(resp, "text") else "")
        print("API error:", status, body, file=sys.stderr); sys.exit(1)

    data = resp.json()
    try:
        content = data["choices"][0]["message"]["content"]
    except Exception:
        print("Unexpected API response:", json.dumps(data)[:1400], file=sys.stderr); sys.exit(1)

    content_json = strip_json_fence(content)
    try:
        obj = json.loads(content_json)
    except json.JSONDecodeError as e:
        raw_path = args.output_json + ".raw.txt"
        write_text(raw_path, content)
        print("Model did not return valid JSON. Raw saved to:", raw_path, file=sys.stderr)
        print("Decode error:", e, file=sys.stderr)
        sys.exit(1)

    obj = apply_hints_to_obj(obj, section_examples_hint, rule_examples_hint)
    write_text(args.output_json, json.dumps(obj, ensure_ascii=False, indent=2))
    print("Wrote:", args.output_json)

    if os.environ.get("RULES_SIDECAR", "1") == "1":
        write_rules_sidecar(args.output_json, markdown, obj, rule_examples_hint, section_examples_hint)
    if os.environ.get("META_SIDECAR", "1") == "1":
        meta = {
            "model": os.environ.get("MODEL", ""),
            "backend": os.environ.get("LLM_BACKEND", "openai"),
            "seed": int(os.environ.get("SEED", "1234")),
            "prompt_path": os.path.abspath(prompt_path),
            "input_md_path": os.path.abspath(args.input_md),
            "output_json_path": os.path.abspath(args.output_json),
            "md_sha256": md_hash,
        }
        write_text(args.output_json + ".meta.json", json.dumps(meta, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
