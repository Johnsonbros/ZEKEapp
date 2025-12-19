# ZekeAssistant Sync Guide

Quick reference for syncing between ZekeAssistant and the original repositories.

## Repository URLs

| Repo | URL | Visibility |
|------|-----|------------|
| ZekeAssistant | https://github.com/Johnsonbros/ZekeAssistant | Public |
| Zeke | https://github.com/Johnsonbros/Zeke | Private |
| ZEKEapp | https://github.com/Johnsonbros/ZEKEapp | Public |

## Directory Mapping

| ZekeAssistant Path | Original Repo |
|-------------------|---------------|
| `backend/` | Zeke |
| `mobile/` | ZEKEapp |

## Sync Commands

### Pull from Original Repos (Update ZekeAssistant)

```bash
# From your local ZekeAssistant directory:

# Pull backend updates from Zeke
git subtree pull --prefix=backend https://github.com/Johnsonbros/Zeke.git main --squash

# Pull mobile updates from ZEKEapp  
git subtree pull --prefix=mobile https://github.com/Johnsonbros/ZEKEapp.git main --squash

# Remove android folder (always excluded)
rm -rf backend/android

# Push updates to ZekeAssistant
git push origin main
```

### Push to Original Repos (Update Zeke/ZEKEapp from ZekeAssistant)

```bash
# From your local ZekeAssistant directory:

# Push backend changes to Zeke
git subtree push --prefix=backend https://github.com/Johnsonbros/Zeke.git main

# Push mobile changes to ZEKEapp
git subtree push --prefix=mobile https://github.com/Johnsonbros/ZEKEapp.git main
```

## Workflow Examples

### Scenario 1: Made changes in Zeke, want to update ZekeAssistant

```bash
cd ZekeAssistant
git subtree pull --prefix=backend https://github.com/Johnsonbros/Zeke.git main --squash
rm -rf backend/android
git push origin main
```

### Scenario 2: Made changes in ZekeAssistant backend, want to update Zeke

```bash
cd ZekeAssistant
git subtree push --prefix=backend https://github.com/Johnsonbros/Zeke.git main
```

### Scenario 3: AI made improvements in ZekeAssistant, push to both original repos

```bash
cd ZekeAssistant
git pull origin main  # Get AI changes

# Push to both original repos
git subtree push --prefix=backend https://github.com/Johnsonbros/Zeke.git main
git subtree push --prefix=mobile https://github.com/Johnsonbros/ZEKEapp.git main
```

### Scenario 4: Full sync - pull all updates, then push any local changes

```bash
cd ZekeAssistant

# Pull latest from both
git subtree pull --prefix=backend https://github.com/Johnsonbros/Zeke.git main --squash
git subtree pull --prefix=mobile https://github.com/Johnsonbros/ZEKEapp.git main --squash
rm -rf backend/android

# Push to ZekeAssistant
git push origin main

# Push back to original repos (if needed)
git subtree push --prefix=backend https://github.com/Johnsonbros/Zeke.git main
git subtree push --prefix=mobile https://github.com/Johnsonbros/ZEKEapp.git main
```

## Privacy Reminder

The `backend/android/` folder is:
- Included in the private Zeke repo
- Excluded from the public ZekeAssistant repo via .gitignore

Never commit the android folder to ZekeAssistant. If it appears after a pull:
```bash
rm -rf backend/android
git add -A
git commit -m "Remove android folder"
git push origin main
```

## Tips

1. **Always pull before push** - Keeps everything in sync
2. **Check for android folder** - Remove it after pulling from Zeke
3. **Use --squash** - Keeps commit history clean
4. **Commit often in ZekeAssistant** - Makes syncing easier
