---
title: Copilot workspace instructions
description: Short guidance for Copilot agents working in this repository.
---

# Copilot Workspace Instructions (HuGoal)

Purpose: provide concise, repeatable guidance for Copilot agents working in this repository. Follow the "link, don't embed" principle: prefer reading the referenced docs rather than duplicating large content here.

Essential reading (in order):
- `docs/agent-plans/README.md` (then 01-* → 10-*)
- `docs/components_prompts/execution_plan.md` and files under `docs/components_prompts/`
- `docs/development-setup.md`
- `CLAUDE.md` (operational rules)
- `package.json` (scripts for build/test)

Discovery checklist (first actions):
- Open and note `package.json` scripts used for start/build/test.
- Inspect `docs/agent-plans/` for the current phase and acceptance criteria.
- Inspect `components/` (especially `components/ui`, `components/workouts`, `components/nutrition`, `components/community`) for reusable components to extend.

Key rules and patterns:
- Reuse-first: prefer extending existing components. If 70%+ of desired behavior exists, extend; otherwise create a new component with a standard API.
- Component contract (when applicable): `variant`, `size`, `tone`, `fullWidth`; state props `value`/`defaultValue`/`open`/`onOpenChange`/`checked`; behavior props `loading`/`disabled`/`editable`; style props `className`/`contentClassName`/`containerClassName`; events `onPress`/`onChange`/`onSelect`.
- Always support dark/light theme and provide loading, empty, and error states for data components.
- Work by closed phase: implement only the current phase's scope from `docs/agent-plans/*`. Do not move on to the next phase without a review gate.
- If a change impacts production flows, prefer backward-compatible edits or a local feature flag and document the risk.

Deliverables checklist for changes:
- Short summary of intent and rationale (one paragraph).
- Files changed list and brief description.
- Commands run locally (`npm run tsc-check`, `npm run lint`) and results.
- Follow-up tasks and testing notes.

Example prompts to use with this repo:
- "Implement a reusable `Button` component following design tokens; read `docs/components_prompts/execution_plan.md` first."
- "Add phase checklist for Phase 02 — read `docs/agent-plans/02-onboarding-and-profile.md` and propose UI tasks."

If anything is unclear about scope or acceptance criteria, ask one concise clarifying question before making changes.
