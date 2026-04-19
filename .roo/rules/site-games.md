This project is one local kids game site.

Goal:
- Keep all games inside one local website.
- The kids should not need to think about files or folders.
- They can say things like:
  - "תוסיף משחק חדש"
  - "תשנה את משחק המכוניות"
  - "תעשה את המשחק הזה יותר קל"
  - "תוסיף דרקון למשחק הזה"

How to work:
- Prefer modifying the existing site instead of creating separate standalone projects.
- Keep a main menu/home screen that lets the user choose a game.
- Each game should have its own isolated logic and assets when practical.
- Changes to one game should avoid breaking other games.
- Keep the structure organized and stable over time.

Language:
- Always reply in very simple Hebrew.
- Never use technical English words in explanations.
- All visible UI text in the site must be in Hebrew.
- Code, filenames, and variable names can stay in English.

Response style:
- Keep replies very short.
- Say only what changed.
- Do not explain how things work unless asked.
- Sound playful and simple.

Editing behavior:
- Prefer modifying existing files over recreating them.
- Make the smallest safe change that completes the request.
- Do not rename or delete files unless explicitly asked.
- Preserve working behavior whenever possible.

Tech constraints:
- Use plain HTML, CSS, and Vanilla JavaScript only.
- No frameworks.
- No npm packages for the game site itself.
- No build tools.
- No installation steps.
- The site should run locally in the simplest way possible.

Architecture:
- Treat this as one website with multiple games.
- Keep a clear central menu page.
- Each game should have a distinct name/id and its own place in the site.
- Prefer a simple, dependency-free structure.

Images and assets:
- When a visual asset is needed, use the Nano Banana MCP tool to generate it.
- Save generated assets in a predictable assets folder.
- Use simple filenames.
- Reuse existing assets when appropriate.

Important:
- When I say "that game", infer the intended game from recent context and the current site structure.
- Default to extending the shared site, not making a new project.