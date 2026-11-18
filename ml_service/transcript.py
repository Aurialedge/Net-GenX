"""
Chat-history parsing for the multi-turn Counter-Intelligence analysis.

Turns an uploaded / pasted chat export into ``[{sender, text, ts}]``. Supported:
  * WhatsApp Android export   "12/03/24, 10:15 pm - Priya: message"
  * WhatsApp iPhone export    "[12/03/24, 10:15:32 PM] Priya: message"
  * Telegram JSON export      {"messages": [{"from": ..., "text": ...}]}
  * JSON list                 [{"sender"|"from"|"name"|"role": ..., "text"|"message": ...}]
  * CSV with a header         sender,text  (or from/name/author + message/content/body)
  * Plain "Name: message" lines, or bare lines (treated as one unknown sender)

Lines that do not start a new message are continuation lines of the previous one.
WhatsApp system notices and media placeholders are dropped.
"""
import csv
import io
import json
import re
from datetime import datetime

MAX_MESSAGES = 200  # /shield/conversation limit; the most recent messages are kept

# zero-width / directional marks WhatsApp inserts, and the narrow no-break space before am/pm
_INVISIBLE = re.compile(r"[‎‏‪-‮⁦-⁩﻿]")
_DATE = r"\d{1,4}[./-]\d{1,2}[./-]\d{1,4}"
_TIME = r"\d{1,2}[:.]\d{2}(?:[:.]\d{2})?(?:\s?[apAP]\.?\s?[mM]\.?)?"
_WA_ANDROID = re.compile(rf"^({_DATE}),?\s+({_TIME})\s+-\s+(.*)$")
_WA_IOS = re.compile(rf"^\[({_DATE}),?\s+({_TIME})\]\s+(.*)$")
_NAME_MSG = re.compile(r"^([^:\n]{1,60}?):\s(.*)$", re.S)
_SYSTEM = re.compile(
    r"end-to-end encrypted|created group|added you|changed (?:the )?(?:subject|group|this group|their phone)|"
    r"left$|joined using|security code changed|message was deleted|This message was deleted|"
    r"You deleted this message|Missed (?:voice|video) call|disappearing messages", re.I)
_MEDIA = re.compile(r"^<?(?:Media omitted|image omitted|video omitted|audio omitted|sticker omitted|"
                    r"GIF omitted|document omitted)>?$", re.I)
_ATTACHED = re.compile(r"^<?\s*attached:\s*(.+?)\s*>?$", re.I)

# Copy-pasted chats (Instagram, SMS, many apps) put the time / date on its own line.
_CLOCK_LINE = re.compile(r"^\[?\s*(?:(?:today|yesterday|mon|tue|wed|thu|fri|sat|sun)\w*,?\s+)?"
                         r"(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?\s*([ap])?\.?\s*m?\.?\s*\]?\s*(?:✓✓?|seen|read|delivered|sent)?$", re.I)
_DATE_LINE = re.compile(r"^(?:today|yesterday|(?:mon|tues|wednes|thurs|fri|satur|sun)day"
                        r"|\d{1,2}(?:st|nd|rd|th)?\s+[a-z]{3,9},?(?:\s+\d{4})?|[a-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?,?(?:\s+\d{4})?"
                        r"|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})$", re.I)
# sender labels that mean "the person reporting this chat"
ME_LABELS = {"me", "you", "myself", "main", "self", "reporter"}

SENDER_KEYS = ("sender", "from", "name", "author", "role", "user")
TEXT_KEYS = ("text", "message", "content", "body", "msg")


def _clean(s):
    return _INVISIBLE.sub("", str(s)).replace(" ", " ").replace(" ", " ").strip()


def _from_records(records):
    out = []
    for r in records:
        if not isinstance(r, dict):
            out.append({"sender": "Unknown", "text": _clean(r), "ts": None})
            continue
        sender = next((r[k] for k in SENDER_KEYS if r.get(k)), "Unknown")
        text = next((r[k] for k in TEXT_KEYS if r.get(k) is not None), "")
        if isinstance(text, list):  # Telegram: text can be a list of strings / {"text": ...} entities
            text = "".join(t if isinstance(t, str) else str(t.get("text", "")) for t in text)
        out.append({"sender": _clean(sender), "text": _clean(text), "ts": r.get("date") or r.get("ts")})
    return out


def _try_json(raw):
    s = raw.lstrip()
    if not s.startswith(("[", "{")):
        return None
    try:
        data = json.loads(s)
    except ValueError:
        return None
    if isinstance(data, dict):
        data = data.get("messages") or data.get("chat") or data.get("data")
    return _from_records(data) if isinstance(data, list) else None


def _try_csv(raw):
    first = raw.lstrip().splitlines()[0] if raw.strip() else ""
    cols = [c.strip().strip('"').lower() for c in first.split(",")]
    if not (any(k in cols for k in SENDER_KEYS) and any(k in cols for k in TEXT_KEYS)):
        return None
    rows = list(csv.DictReader(io.StringIO(raw.lstrip())))
    return _from_records([{k.strip().lower(): v for k, v in row.items() if k} for row in rows])


def _parse_lines(raw):
    msgs, timestamped, named = [], False, False
    for line in raw.splitlines():
        line = _clean(line)
        if not line:
            continue
        ck = _CLOCK_LINE.match(line)
        if ck:  # "6:30 PM" on its own line: the time of the message above, not a message
            if msgs and msgs[-1] is not None and msgs[-1]["ts"] is None:
                h = int(ck.group(1)) % 12 + (12 if (ck.group(3) or "").lower() == "p" else 0) if ck.group(3) else int(ck.group(1))
                msgs[-1]["ts"] = f"clock:{h * 3600 + int(ck.group(2)) * 60}"
            continue
        if _DATE_LINE.match(line):  # "Today", "Monday", "12 Nov 2026" separators
            continue
        m = _WA_IOS.match(line) or _WA_ANDROID.match(line)
        if m:
            timestamped = True
            ts, rest = f"{m.group(1)} {m.group(2)}", m.group(3)
            nm = _NAME_MSG.match(rest)
            if not nm:  # "Messages and calls are end-to-end encrypted", "X added Y" ...
                msgs.append(None)
                continue
            msgs.append({"sender": nm.group(1).strip(), "text": nm.group(2).strip(), "ts": ts})
            continue
        nm = None if timestamped else _NAME_MSG.match(line)
        if nm and not re.match(r"^https?$", nm.group(1), re.I):
            named = True
            msgs.append({"sender": nm.group(1).strip(), "text": nm.group(2).strip(), "ts": None})
        elif (timestamped or named) and msgs and msgs[-1] is not None:  # continuation of a multi-line message
            msgs[-1]["text"] += "\n" + line
        elif not timestamped and not named:  # bare lines: one message per line
            msgs.append({"sender": "Unknown", "text": line, "ts": None})
    return [m for m in msgs if m]


def _date_order(stamps):
    """'dmy' or 'mdy' from all WhatsApp dates in the file (export follows the phone's locale)."""
    for st in stamps:
        a, b = (int(x) for x in re.split(r"[./-]", st.split()[0])[:2])
        if a > 12:
            return "dmy"
        if b > 12:
            return "mdy"
    return "dmy"  # Indian default


def _to_epoch(ts, order):
    """WhatsApp 'dd/mm/yy h:mm pm' or ISO-8601 -> epoch seconds (None if unparseable)."""
    if ts is None:
        return None
    if isinstance(ts, (int, float)):
        return float(ts)
    ts = str(ts).strip()
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
    except ValueError:
        pass
    m = re.match(r"(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([apAP])?", ts)
    if not m:
        return None
    a, b, c, hh, mm, ss, ampm = m.groups()
    if len(a) == 4:
        y, mo, d = int(a), int(b), int(c)
    else:
        d, mo = (int(a), int(b)) if order == "dmy" else (int(b), int(a))
        y = int(c) + (2000 if len(c) == 2 else 0)
    h = int(hh) % 12 + (12 if ampm and ampm.lower() == "p" else 0) if ampm else int(hh)
    try:
        return datetime(y, mo, d, h, int(mm), int(ss or 0)).timestamp()
    except ValueError:
        return None


def parse_transcript(raw):
    """Return {"messages": [...], "senders": [{name, count}], "format": str, "truncated": int}."""
    raw = (raw or "").replace("\r\n", "\n").replace("\r", "\n")
    fmt, msgs = "json", _try_json(raw)
    if msgs is None:
        fmt, msgs = "csv", _try_csv(raw)
    if msgs is None:
        msgs = _parse_lines(raw)
        fmt = "whatsapp" if any(m["ts"] and not str(m["ts"]).startswith("clock:") for m in msgs) else "lines"
    for m in msgs:  # "<attached: DA_Arrears.docm>" -> keep the file name: it is evidence (payload rules)
        m["text"] = _ATTACHED.sub(r"[attachment] \1", m["text"])
    msgs = [m for m in msgs if m["text"] and not _MEDIA.match(m["text"]) and not _SYSTEM.search(m["text"])]
    order = _date_order([m["ts"] for m in msgs if isinstance(m.get("ts"), str) and re.match(r"\d", m["ts"])])
    day, last = datetime(2026, 1, 1).timestamp(), None
    for m in msgs:
        ts = m.get("ts")
        if isinstance(ts, str) and ts.startswith("clock:"):  # time-of-day only: keep order, roll over midnight
            sec = float(ts[6:])
            if last is not None and day + sec < last:
                day += 86400
            m["ts"] = last = day + sec
        else:
            m["ts"] = _to_epoch(ts, order)
    # unnamed paste: every line came from "Unknown". Chats alternate speakers far more often
    # than not, so label turns Person 1 / Person 2 and let the reporter pick (UI says so).
    speakers_inferred = False
    if fmt == "lines" and len(msgs) >= 2 and all(m["sender"] == "Unknown" for m in msgs):
        for i, m in enumerate(msgs):
            m["sender"] = "Person 1" if i % 2 == 0 else "Person 2"
        speakers_inferred = True
    truncated = max(0, len(msgs) - MAX_MESSAGES)
    msgs = msgs[-MAX_MESSAGES:]
    counts = {}
    for m in msgs:
        counts[m["sender"]] = counts.get(m["sender"], 0) + 1
    senders = [{"name": n, "count": c} for n, c in sorted(counts.items(), key=lambda kv: -kv[1])]
    suggested_me = next((n for n in counts if n.strip().lower() in ME_LABELS), None)
    return {"messages": msgs, "senders": senders, "format": fmt, "truncated": truncated,
            "speakers_inferred": speakers_inferred, "suggested_me": suggested_me}


def to_conversation(messages, me):
    """Map parsed messages to the shield's {text, role} turns; ``me`` is the reporter's own name."""
    me_n = (me or "").strip().lower()
    if not me_n:  # "Me:" / "You:" labels identify the reporter even if they did not pick one
        me_n = next((m["sender"].strip().lower() for m in messages if m["sender"].strip().lower() in ME_LABELS), "")
    return [{"text": m["text"], "role": "user" if me_n and m["sender"].strip().lower() == me_n else "contact",
             "ts": m.get("ts")} for m in messages]
