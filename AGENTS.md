# AGENTS.md

Канонические инструкции для ВСЕХ кодинг-агентов: Claude Code (через симлинк `CLAUDE.md → AGENTS.md`), Codex, Cursor, Gemini CLI и любых будущих.

duckbug-js — официальный JavaScript/TypeScript SDK DuckBug: отправка ошибок и логов в ingest DuckBug.

- Контракт протокола — репозиторий `duckbug-sdk-spec` (текущие расхождения — в `SDK-SPEC-TODOS.md`); изменения формата событий сверяй с ним и с серверным ingest (`duckbug`).
- Отвечай на русском; код, коммиты и документация — на английском.
- **Без AI-соавторства**: никаких `Co-Authored-By: <ИИ>` в коммитах (для Claude Code продублировано в `.claude/settings.json`).
- **Не коммитить и не пушить без явной команды.**
