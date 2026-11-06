---
defaults: standard
tracker:
  kind: file
  board_root: ./kanban
workspace:
  root: ~/symphony_workspaces/orgnote
  reuse_policy: refresh
agent:
  kind: codex
  auto_merge_push_target: false
server:
  host: 127.0.0.1
  port: 10001
---

You are working on {{ issue.identifier }}: {{ issue.title }}.
