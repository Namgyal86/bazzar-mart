#!/usr/bin/env bash
# Claude Code status line script
input=$(cat)

cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // "unknown"')
model=$(echo "$input" | jq -r '.model.display_name // "unknown"')
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')

# Shorten cwd: replace home directory with ~
home_dir=$(echo ~)
short_cwd="${cwd/#$home_dir/~}"

# Build context window display
ctx_display=""
if [ -n "$used_pct" ]; then
  ctx_int=$(printf "%.0f" "$used_pct")
  ctx_display=" | ctx:${ctx_int}%"
fi

printf "\033[2m%s\033[0m \033[2m| %s%s\033[0m" "$short_cwd" "$model" "$ctx_display"
