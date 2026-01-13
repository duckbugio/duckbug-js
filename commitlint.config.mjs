export default {
  extends: ["@commitlint/config-conventional"],
  helpUrl: "https://www.conventionalcommits.org/",
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    "type-empty": [
      2,
      "never",
      "❌ Тип коммита обязателен!\n\n📝 Формат коммита: <type>: <описание>\n💡 Примеры:\n   feat: добавить новую функцию\n   fix: исправить обработку ошибок",
    ],
    "subject-min-length": [2, "always", 10],
    "subject-max-length": [2, "always", 72],
    "subject-case": [2, "always", "lower-case"],
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 100],
  },
  defaultIgnores: true,
  ignores: [
    (commit) => /^WIP/i.test(commit),
    (commit) => /^Merge/i.test(commit),
    // Временное игнорирование старых коммитов до настройки commitlint
    // TODO: Удалить после исправления старых коммитов или слияния PR
    (commit) => {
      const oldCommitPatterns = [
        /^Fix\s/i, // "Fix quack function"
        /^Support\s/i, // "Support bun in ci"
        /^Rewrite\s/i, // "Rewrite unit tests to bun"
        /^Code review/i, // "Code review"
        /^chore: Add/i, // "chore: Add convention commit rules"
      ];
      return oldCommitPatterns.some((pattern) => pattern.test(commit));
    },
  ],
};
