#!/bin/bash

# 1. Default plan file if --plan isn't provided
PLAN_FILE="PLAN.md"

# 2. Parse arguments (e.g., --plan=/path/to/plan.md)
for i in "$@"; do
  case $i in
    --plan=*)
      PLAN_FILE="${i#*=}"
      shift
      ;;
    *)
      # Unknown option
      ;;
  esac
done

# Validate that the specified plan file actually exists
if [ ! -f "$PLAN_FILE" ]; then
  echo "Error: Plan file '$PLAN_FILE' not found."
  exit 1
fi

PLAN_TRACKER="PLAN_TRACKER.md"

# 3. Only create PLAN_TRACKER.md if it doesn't exist OR is completely empty
if [ ! -s "$PLAN_TRACKER" ]; then
  echo "Initializing $PLAN_TRACKER from $PLAN_FILE..."
  cp "$PLAN_FILE" "$PLAN_TRACKER"
else
  echo "Resuming from existing $PLAN_TRACKER..."
fi

# 4. Main loop
while true; do
  TASK=$(grep -m1 "^- \[ \]" "$PLAN_TRACKER" | sed 's/- \[ \] //' | tr -d '\r\n')
  [ -z "$TASK" ] && { echo "All tasks completed!"; break; }

  LINE_NUM=$(grep -n "^- \[ \]" "$PLAN_TRACKER" | head -1 | cut -d: -f1)
  echo "Executing task: $TASK"
  
  # Injecting the dynamic $PLAN_FILE into the context block
  cat <<EOF | claude -p --dangerously-skip-permissions
Your current scoped task is: $TASK
Consider previous tasks listed above this one in the checklist as completed. Do not re-evaluate or re-do them. Focus only on the current scoped task.

$(cat PROMPT.md)
$(cat "$PLAN_FILE")
EOF

  EXIT_CODE=$?

  if [ $EXIT_CODE -ne 0 ]; then
    echo "Task failed. Marking as BLOCKED."
    sed -i '' "${LINE_NUM}s/- \[ \]/- [BLOCKED]/" "$PLAN_TRACKER"
    break
  fi

  sed -i '' "${LINE_NUM}s/- \[ \]/- [x]/" "$PLAN_TRACKER"
done