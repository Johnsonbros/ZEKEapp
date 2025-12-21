# ZEKE Android ↔ Replit Sync Guide

This Replit environment contains the contents of the `android/` folder from the ZEKE repository.

## Setup Instructions (One-Time)

### Step 1: Create a GitHub Repository for this Replit

1. Go to GitHub and create a new repository (e.g., `Zeke-Android-Replit`)
2. Connect this Replit to that repository using Replit's GitHub integration
3. Push the initial code

### Step 2: Set Up Secrets in the ZEKE Repository

Go to **ZEKE repo → Settings → Secrets and variables → Actions** and add:

| Secret Name | Value |
|-------------|-------|
| `REPLIT_REPO` | `Johnsonbros/Zeke-Android-Replit` (your new repo name) |
| `REPLIT_PAT` | A Personal Access Token with `repo` scope |

### Step 3: Add the Workflow to ZEKE

Copy the file `.github/workflows/sync-android-to-replit.yml` from this Replit to the ZEKE repository's `.github/workflows/` folder.

---

## How Sync Works

### Automatic: ZEKE → Replit (on push)

When you push changes to the `android/` folder in ZEKE:
1. GitHub Action triggers automatically
2. Syncs all changes to the Replit GitHub repo
3. Replit picks up changes automatically

### Manual: Replit → ZEKE (on demand)

When you want to push Replit changes back to ZEKE:

**Option A: Use GitHub Actions (Recommended)**
1. Push your changes to the Replit GitHub repo
2. Go to the Replit GitHub repo → Actions → "Sync Replit to ZEKE"
3. Click "Run workflow" and enter a commit message

**Option B: Manual rsync**
```bash
# On your local machine
git clone https://github.com/Johnsonbros/Zeke.git zeke-temp
git clone https://github.com/Johnsonbros/Zeke-Android-Replit.git replit-temp

rsync -av --delete \
  --exclude='.git' \
  --exclude='.replit' \
  --exclude='node_modules' \
  --exclude='.github' \
  replit-temp/ \
  zeke-temp/android/

cd zeke-temp
git add -A
git commit -m "Sync from Replit"
git push origin main
```

---

## What Gets Synced

| Direction | Source | Destination | Exclusions |
|-----------|--------|-------------|------------|
| ZEKE → Replit | `android/` | Root (`/`) | `.git`, `.replit`, `node_modules` |
| Replit → ZEKE | Root (`/`) | `android/` | `.git`, `.replit`, `node_modules`, `.github` |

---

## File Structure

```
ZEKE Repository
├── android/          ← Synced with this Replit
│   ├── client/
│   ├── server/
│   ├── assets/
│   └── ...
├── backend/
└── other-folders/

This Replit
├── client/           ← From android/client/
├── server/           ← From android/server/
├── assets/           ← From android/assets/
└── ...
```

---

## Troubleshooting

### Changes not syncing?

1. Check GitHub Actions logs in both repos
2. Verify the PAT has `repo` scope
3. Ensure branch names match (`main`)

### Conflict resolution

If both repos changed the same files:
1. Pull latest from both repos locally
2. Resolve conflicts manually
3. Push to the appropriate repo

---

## Quick Reference

| Action | Method |
|--------|--------|
| Edit in Replit | Make changes → Push to GitHub → Trigger reverse sync |
| Edit in ZEKE | Make changes to `android/` → Auto-syncs to Replit |
| Force sync ZEKE → Replit | Go to ZEKE Actions → Run "Sync Android to Replit" manually |
| Force sync Replit → ZEKE | Go to Replit Actions → Run "Sync Replit to ZEKE" manually |
