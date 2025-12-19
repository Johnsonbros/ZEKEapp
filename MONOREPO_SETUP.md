# ZekeAssistant Monorepo Setup Guide

This guide explains how to set up ZekeAssistant as a unified monorepo with two-way sync to both original repositories (Zeke backend and ZEKEapp mobile).

## Overview

**Repository Structure:**
```
ZekeAssistant/
├── backend/          ← From Zeke repo (excludes android/)
│   ├── client/       ← Web UI
│   ├── server/       ← Backend API
│   ├── python_agents/← AI agents
│   └── ...
│
├── mobile/           ← From ZEKEapp repo
│   ├── client/       ← Mobile app
│   ├── server/       ← Mobile proxy
│   └── ...
│
├── .gitignore        ← Excludes backend/android/
└── README.md
```

## Prerequisites

- Git installed on your local machine
- GitHub access to all three repositories:
  - https://github.com/Johnsonbros/ZekeAssistant (public)
  - https://github.com/Johnsonbros/Zeke (private)
  - https://github.com/Johnsonbros/ZEKEapp (public)

## One-Time Setup

Run these commands on your local machine to set up the monorepo:

```bash
# 1. Clone ZekeAssistant
git clone https://github.com/Johnsonbros/ZekeAssistant.git
cd ZekeAssistant

# 2. Remove existing content (keeping .git)
find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} +

# 3. Create initial README
cat > README.md << 'EOF'
# ZekeAssistant

Unified monorepo combining ZEKE backend and ZEKEapp mobile companion.

## Structure
- `backend/` - ZEKE backend server and web UI
- `mobile/` - ZEKEapp mobile companion app

## Sync Commands
See SYNC_GUIDE.md for commands to sync with original repositories.
EOF

# 4. Add ZEKEapp as subtree at mobile/
git subtree add --prefix=mobile https://github.com/Johnsonbros/ZEKEapp.git main --squash

# 5. Add Zeke as subtree at backend/
git subtree add --prefix=backend https://github.com/Johnsonbros/Zeke.git main --squash

# 6. Create .gitignore to exclude android/
cat > .gitignore << 'EOF'
# Exclude private android folder from Zeke
backend/android/

# Node modules (handled per-project)
node_modules/

# Environment files
.env
.env.local

# IDE
.idea/
.vscode/

# OS files
.DS_Store
Thumbs.db
EOF

# 7. Remove android folder if it was pulled
rm -rf backend/android

# 8. Commit and push
git add -A
git commit -m "Set up monorepo with backend and mobile subtrees"
git push origin main
```

## Daily Sync Commands

### Pull updates FROM original repos INTO ZekeAssistant

```bash
cd ZekeAssistant

# Pull latest from Zeke backend
git subtree pull --prefix=backend https://github.com/Johnsonbros/Zeke.git main --squash

# Pull latest from ZEKEapp mobile
git subtree pull --prefix=mobile https://github.com/Johnsonbros/ZEKEapp.git main --squash

# Remove android if it got pulled
rm -rf backend/android

# Push to ZekeAssistant
git push origin main
```

### Push changes FROM ZekeAssistant BACK TO original repos

```bash
cd ZekeAssistant

# Push backend changes back to Zeke
git subtree push --prefix=backend https://github.com/Johnsonbros/Zeke.git main

# Push mobile changes back to ZEKEapp
git subtree push --prefix=mobile https://github.com/Johnsonbros/ZEKEapp.git main
```

## Quick Reference Scripts

Save these as shell scripts for easy use:

### sync-pull.sh
```bash
#!/bin/bash
# Pull updates from both original repos

cd "$(dirname "$0")"

echo "Pulling from Zeke..."
git subtree pull --prefix=backend https://github.com/Johnsonbros/Zeke.git main --squash

echo "Pulling from ZEKEapp..."
git subtree pull --prefix=mobile https://github.com/Johnsonbros/ZEKEapp.git main --squash

echo "Removing android folder..."
rm -rf backend/android

echo "Pushing to ZekeAssistant..."
git push origin main

echo "Done!"
```

### sync-push-backend.sh
```bash
#!/bin/bash
# Push backend changes back to Zeke

cd "$(dirname "$0")"
git subtree push --prefix=backend https://github.com/Johnsonbros/Zeke.git main
echo "Backend pushed to Zeke!"
```

### sync-push-mobile.sh
```bash
#!/bin/bash
# Push mobile changes back to ZEKEapp

cd "$(dirname "$0")"
git subtree push --prefix=mobile https://github.com/Johnsonbros/ZEKEapp.git main
echo "Mobile pushed to ZEKEapp!"
```

## Important Notes

1. **Android folder is always excluded** - The `.gitignore` ensures `backend/android/` never gets committed to ZekeAssistant (public repo).

2. **Squash commits** - The `--squash` flag keeps history clean by combining all subtree changes into single commits.

3. **Conflict resolution** - If you get merge conflicts when pulling, resolve them locally then commit.

4. **AI Assistance** - Once set up, AI tools can see both `backend/` and `mobile/` folders in ZekeAssistant to help with cross-project improvements.

## Troubleshooting

### "Updates were rejected because the tip of your current branch is behind"
```bash
git pull --rebase origin main
git push origin main
```

### Subtree push fails with merge issues
```bash
# Force recreate the subtree split
git subtree split --prefix=backend -b temp-split
git push https://github.com/Johnsonbros/Zeke.git temp-split:main --force
git branch -D temp-split
```

### Android folder accidentally committed
```bash
rm -rf backend/android
git add -A
git commit -m "Remove android folder"
git push origin main
```
