# Адаптация duckbug-js под duckbug-sdk-spec

Чеклист задач (синхронизирован с планом в `.cursor/plans/Adopt duckbug-sdk-spec-fe213aae.plan.md`).

Источник спецификации: репозиторий `duckbug-sdk-spec` (идеология, контракт, приватность, архитектура, нейминг).

## Задачи

- [x] **types-schemas** — Типы error/log по контракту + копия schemas + contract-тесты (ajv/аналог); фикс `DuckSDK.error` → `ERROR`
- [x] **core-provider-refactor** — Слой событий: `Provider.sendLog` / `sendError`; `Duck` + `DuckBugProvider.fromDSN` + URL `/ingest/{projectId}:{key}/...`; `setScope` для общих полей
- [x] **payload-semantics** — `message` из `error.message`, тег → `dTags`, `exception` / `stacktraceAsString`, `sdk` + `platform` на логах; нормализация `context` в консольном провайдере
- [x] **privacy-delivery** — Санитизация; `eventId`; `stripSections`; `beforeSend` в `DuckSDK` / `DuckBugConfig`; `onTransportError`; очередь, `flush()`, batch (`/logs/batch`, `/errors/batch`), retry с тем же `eventId`
- [x] **branding-docs** — `Duck`, `quack`, `captureException`, `Pond.ripple`, обновлённый README и пример multi-provider
- [x] **integrations** — `registerNodeGlobalErrorHandlers` в `integrations/node.ts` (`unhandledRejection` / `uncaughtException`); мост к доминантному логгеру Node по-прежнему опционален отдельным слоем

## Критерий готовности

Чеклист `docs/05-language-implementation-checklist.md`: основные пункты A–F, H, I закрыты в коде и тестах; секция G (отдельный logging bridge npm-пакета) и полный набор framework adapters сознательно вне минимального core.
