# Git Workflow

When pushing changes and creating PRs:

1. Always check if the branch has been pushed before. If not, use `git push -u` to set the upstream tracking branch on the first push. This ensures that future pushes and `gh pr create` commands work smoothly without needing to specify the remote/branch each time.
2. If the branch already has an associated PR, push to whichever remote the branch is tracking.
3. If the branch hasn't been pushed before, default to pushing to `origin`.

## `gh pr create` branch detection

If `gh pr create` says `you must first push the current branch to a remote` even though `git push -u` succeeded, create the PR with an explicit head ref:

```bash
gh pr create --head <owner>:<branch> ...
```

## GITHUB_TOKEN and workflow chaining

Actions performed using the default `GITHUB_TOKEN` (including labels added by `github-actions[bot]` via `actions/github-script`) do **not** trigger `pull_request_target` or other workflow events. This is a GitHub limitation to prevent infinite loops. If one workflow adds a label that should trigger another workflow (e.g., `label-rebase-prs.yml` adds `cc:rebase` to trigger `claude-rebase.yml`), the label-adding step must use a **PAT** or **GitHub App token** (e.g., `PR_RW_GITHUB_TOKEN`) instead of `GITHUB_TOKEN`.

## GitHub API calls with special characters

When using `gh api` to post comments or replies containing backticks, `$()`, or other shell metacharacters, the security hook will block the command. Instead of passing the body inline with `-f body="..."`, write a JSON file and use `--input`:

```bash
# Write JSON body to a file (use the Write tool, not echo/cat)
# File: .claude/tmp/reply_body.json
# {"body": "Your comment with `backticks` and special chars"}

gh api repos/${GH_ORG}/${GH_REPO_NAME}/pulls/123/comments/456/replies --input .claude/tmp/reply_body.json
```

## Adding labels to PRs

`gh pr edit --add-label` can fail for two reasons:


## Force-pushing after rebase with changes ahead and behind head

When rebasing a PR branch that has both new commits in the PR and new commits in upstream/main (i.e., the branch is both ahead and behind), the rebase will create a new commit history that doesn't match the existing remote branch. In this case, you must force-push to update the PR branch with the rebased commits. Use `--force-with-lease` to avoid overwriting others' work, but if the branch is tracking a different remote (e.g., `origin` instead of `upstream`), and the solution is plain `--force` do not execute. The allowed force push command in this scenario is:


```bash
git push --force-with-lease
```

**Note:** Plain `--force` can overwrite others' remote commits. Inform the team when this scenario comes up, and  `--force-with-lease` cannot work. In normal setups, always prefer `--force-with-lease`.

## Rebase workflow and conflict resolution

### Handling unstaged changes during rebase

If `git rebase` fails with "You have unstaged changes" (common with spurious `package-lock.json` changes):

```bash
git stash push -m "Stashing changes before rebase"
git rebase origin/main
git stash pop
```
The stashed changes will be automatically merged back after the rebase completes.

**Note:**  **Always** use `git state pop` to restore a single stash after the rebase, rather than `git stash apply`, to avoid accidentally applying stash leftovers or the same stash multiple times if you need to rebase again.

## Rebasing with uncommitted changes

If you need to rebase but have uncommitted changes (e.g., package-lock.json from startup npm install):

1. Stash changes: `git stash push -m "Stash changes before rebase"`
2. Rebase: `git rebase origin/main` (resolve conflicts if needed)
3. After rebase completes, review stashed changes: `git stash show -p`
4. If stashed changes are spurious (e.g., package-lock.json peer markers when package.json conflicts were resolved during rebase), drop the stash: `git stash drop`
5. Otherwise, pop stash: `git stash pop` and discard spurious changes: `git restore package-lock.json` (if package.json unchanged)

This prevents rebase conflicts from uncommitted changes while preserving any work in progress.


### Conflict resolution tips

- **Modify/delete conflicts**: When a rebase shows `CONFLICT (modify/delete): <file> deleted in <commit> and modified in HEAD`, use `git rm <file>` (not `git add`) to resolve by confirming the deletion. Use `git add <file>` only when you want to keep the modified version instead.
- **Before rebasing:** If `bun install` modified `package-lock.json` (common in CI/local), discard changes with `git restore package-lock.json` to avoid "unstaged changes" errors
- When resolving import conflicts (e.g., `<<<<<<< HEAD` with different imports), keep **both** imports if both are valid and needed by the component
- If both sides of a conflict have valid imports/hooks, keep both and remove any duplicate constant redefinitions
- **Complementary additions**: When both sides added new sections at the end of a file (e.g., both added different documentation tips), keep both sections rather than choosing one — they're not truly conflicting, just different additions
- **Preserve variable declarations used in common code**: When one side of a conflict declares a variable (e.g., `const iframe = po.previewPanel.getPreviewIframeElement()`) that is referenced in non-conflicting code between or after conflict markers, keep the declaration even when adopting the other side's verification approach — the variable is needed regardless of which style you choose
- **React component wrapper conflicts**: When rebasing UI changes that conflict on wrapper div classes (e.g., `flex items-start space-x-2` vs `flex items-end gap-1`), keep the newer styling from the incoming commit but preserve any functional components (like dialogs or modals) that exist in HEAD but not in the incoming change
- **Refactoring conflicts**: When incoming commits refactor code (e.g., extracting inline logic into helper functions), and HEAD has new features in the same area, integrate HEAD's features into the new structure. Example: if incoming code moves streaming logic to `runSingleStreamPass()` and HEAD adds mid-turn compaction to the inline code, add compaction support to the new function rather than keeping the old inline version

## Git orphan branch pitfalls

- **`git checkout -` does not work after `git checkout --orphan`** — git does not record the pre-orphan branch in a way that `-` can resolve. Always capture the current branch before switching: `PREV=$(git branch --show-current)`, then return explicitly with `git checkout "$PREV"`.
- **Orphan commits break pre-commit hooks that reference `HEAD^1`** — the project's `turbo run lint --filter=[HEAD^1]` hook fails with `fatal: ambiguous argument 'HEAD^1'` on a root commit. Hooks that require a parent commit are incompatible with orphan branches in LocalSpawn environments (DockerExec is unaffected — no hooks installed in shallow clones).
- **`git checkout <branch>` after staging on a side branch discards untracked working-tree files** — when you commit untracked files on branch B and then `git checkout A`, git restores the working tree to branch A's HEAD, removing any files that were committed on B but never existed on A. This affects both orphan branches (Approach B) and regular side branches (Approach D) used as checkpoint mechanisms — all accumulated task output files vanish on checkout-back.

## Shallow clone push limitations

- **"shallow update not allowed" when pushing to an empty remote** — a shallow clone can only push to a remote that already has the shallow boundary commit in its history. Pushing a tag or branch from `git clone --depth 1` to a bare repo with no objects fails. Fix: use the project's existing `origin` (which has full history), not a new empty remote. `git fetch --unshallow` makes the clone full but is expensive and defeats the depth-1 optimization.
- **All git refs in a DockerExec shallow clone are ephemeral** — `cleanWorkspace()` destroys the entire tmpDir including all pack objects, tags, and branches. Refs must be pushed to the origin remote (which has the shallow boundary) before the job reaches a terminal state if they need to survive across job restarts.

## Tracking Tasks

1. **Commit often** with clear, descriptive messages following conventional commits format.
2. **Do not** include AI attribution in commit messages.
3. **Do not** create PRs without passing tests and lint checks — run all relevant tools first.
4. Include the issue tracking ID in branch names, PR titles, and commit messages.
