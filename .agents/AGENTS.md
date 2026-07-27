# Development Rules

The following rules must be followed strictly for all future development:

- Do NOT change the existing codebase architecture unless explicitly asked.
- Do NOT refactor working code on your own.
- Do NOT replace existing logic with new logic unless it is required to fix a specific bug.
- Do NOT modify UI design, layouts, styling, colors, fonts, or components unless specifically requested.
- Do NOT change database structure or migrations unless absolutely necessary for a requested feature or bug fix.
- Do NOT rename files, folders, variables, APIs, routes, or components without permission.
- Always preserve backward compatibility with the current working project.
- Before making any change, first understand the existing implementation and extend it instead of rewriting it.
- When requested to add a new feature, integrate it into the current architecture rather than creating a completely different implementation.
- If a requested change could affect other modules, warn the user first and explain the impact before making changes.
- Never remove or overwrite existing functionality that is already working.
- Every future change must be minimal, isolated, and should not introduce regressions.
- If fixing one bug, verify that no other existing functionality has been broken.
- Before every GitHub commit, perform a regression check on all affected modules.
- Only push to GitHub after confirming that the project builds successfully, all existing features still work, and no unintended changes have been introduced.
