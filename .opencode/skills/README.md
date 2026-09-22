# VERTIGO skills — source of truth

These `vertigo-*` folders are the EDITABLE source (versioned in git).
The agent loader reads skills from the user config dir at SESSION START
(it does not hot-reload), so after editing, mirror + restart the session:

```powershell
$src = "C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\VERTIGO\.opencode\skills"
Copy-Item "$src\vertigo-contracts\SKILL.md"   "$env:USERPROFILE\.config\opencode\skills\vertigo-contracts\SKILL.md" -Force
Copy-Item "$src\vertigo-ae-reference\SKILL.md" "$env:USERPROFILE\.config\opencode\skills\vertigo-ae-reference\SKILL.md" -Force
Copy-Item "$src\vertigo-qa\SKILL.md"           "$env:USERPROFILE\.config\opencode\skills\vertigo-qa\SKILL.md" -Force
```

Evolve inside SKILL.md files (append-only + Changelog + version bump),
mirror, commit, restart session. UI skill (`vertigo-ui`) comes later.
