cp PLAN.md PLAN_TRACKER.md

while true; do
  TASK=$(grep -m1 "^- \[ \]" PLAN_TRACKER.md | sed 's/- \[ \] //' | tr -d '\r\n')
  [ -z "$TASK" ] && break

  LINE_NUM=$(grep -n "^- \[ \]" PLAN_TRACKER.md | head -1 | cut -d: -f1)
  echo "Executing task: $TASK"
  cat <<EOF | claude -p --dangerously-skip-permissions
Your current scoped task is: $TASK
Consider previous tasks listed above this one in PLAN.md checklist as completed. Do not re-evaluate or re-do them. Focus only on the current scoped task.

$(cat PROMPT.md)
$(cat PLAN.md)
EOF

  EXIT_CODE=$?

  if [ $EXIT_CODE -ne 0 ]; then
    sed -i '' "${LINE_NUM}s/- \[ \]/- [BLOCKED]/" PLAN_TRACKER.md
    break
  fi

  sed -i '' "${LINE_NUM}s/- \[ \]/- [x]/" PLAN_TRACKER.md
done