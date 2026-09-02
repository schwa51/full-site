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

## Arkham Cloud Setup

The Arkham investigator library is served by a Netlify Function at
`/api/arkham/characters` and stores each signed-in player's investigators in
Netlify Blobs. Cloudflare Access supplies the player's verified identity.

One-time setup:

1. In Cloudflare Zero Trust, create a separate self-hosted Access application
   for `vaughnrpgs.com/api/arkham/*`.
2. Give that application its own Allow policy containing the players who may
   use the investigator library. This policy is separate from `/gm/*`.
3. Copy the new application's Audience (AUD) tag.
4. In Netlify, add `CLOUDFLARE_ACCESS_ARKHAM_AUD` with that AUD tag. The team
   domain defaults to `schwa51.cloudflareaccess.com`; it can be overridden with
   `CLOUDFLARE_ACCESS_TEAM_DOMAIN` if needed.
5. Trigger a new Netlify deploy after adding the environment variable.

Netlify provisions the Blob store automatically when the function first saves
an investigator.
