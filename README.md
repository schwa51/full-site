# Sam's RPG Archive

This is a modular Eleventy-based site for managing TTRPG campaigns, including:

- 🧙 NPC profiles (player and GM-only)
- 📜 Session logs
- 💎 Items
- 📖 Lore

## Authoring Workflow

1. Write content in Markdown using Obsidian or GitHub
2. Push changes to GitHub
3. Netlify automatically runs `npm run build`
4. Live site updates with new content

## Project Structure

- `sessions/`: Session summaries
- `npcs/`: NPC files (`public: true/false`)
- `items/`: Artifact and equipment entries
- `lore/`: Worldbuilding content
- `gm/`: Private GM materials (use Netlify Identity to restrict)

## Local Development

```bash
npm install
npm start
```

Then visit http://localhost:8080/

## Build for Production

```bash
npm run build
```

Output goes to `_site/`, served by Netlify.
