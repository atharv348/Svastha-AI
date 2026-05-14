---
name: agent-skills
description: Agent skills are reusable instruction sets that extend your coding agent's capabilities.
---

# Agent Skills

Agent skills are reusable instruction sets that extend your coding agent's capabilities. They're defined in SKILL.md files with YAML frontmatter containing a name and description.

## When to Use

Use this skill when you need to manage (install, list, update, remove) agent skills using the `npx skills` CLI or when you want to create a new skill.

## Commands

- `npx skills add <source>`: Add skills from a GitHub repo, URL, or local path.
- `npx skills list`: List all installed skills.
- `npx skills find [query]`: Search for skills.
- `npx skills update [skills]`: Update installed skills.
- `npx skills remove [skills]`: Remove installed skills.
- `npx skills init [name]`: Create a new skill template.

## Creating a Skill

1. Create a directory for your skill.
2. Create a `SKILL.md` file inside that directory.
3. Add YAML frontmatter at the top:
   ```yaml
   ---
   name: your-skill-name
   description: What this skill does
   ---
   ```
4. Add instructions and documentation in Markdown format below the frontmatter.
