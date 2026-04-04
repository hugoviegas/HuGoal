# Phase 10 - Polish

## Suggested specialization

Release and polish agent.

## Objective

Finish the product for release: branding, app metadata, legal text, build profiles, and final quality checks.

## Current Starting Point

- The app already has the base config needed for Expo and NativeWind.
- Release assets and build files still need to be completed.

## Screens and Routes

- `app/settings/about.tsx` for version, author, license, and app metadata.
- `app/settings/appearance.tsx` for dark, light, and system theme controls.
- `app/settings/language.tsx` for language selection.
- Any remaining settings entries should be wired into `app/settings/index.tsx`.

## Step-by-Step Work

1. Add the About screen and the BUSL 1.1 license text.
2. Finish the branding assets, icons, and splash screen setup.
3. Review translation completeness and theme consistency.
4. Add EAS build profiles and verify preview and production outputs.
5. Run a final device QA pass on a clean Android install.
6. Fix remaining accessibility, polish, and navigation issues.

## Screen Behavior

### About

- Show app name, version, build number, author, license summary, and support or contact information.
- Show a short explanation of the source-available license model and what it means for commercial use.

### Appearance

- Let the user choose system, light, or dark mode.
- Show a small preview of how the theme affects surfaces and accent colors.

### Language

- Let the user choose between EN and PT.
- Language changes should apply immediately without requiring a restart.

## Data and Storage

- No new business data is required in this phase.
- Version and build metadata should come from app constants or runtime metadata.
- Theme and language preferences remain local user settings.

## Configuration Questions

- What exact author name and support contact should the About screen show?
- What brand color palette should be used for the final icon, splash, and accent system?
- Should the app show a changelog or only the current version? Recommendation: show the current version and a short update note link if available.
- Which OTA update channel names should be used for development, preview, and production?

## Deliverables

- Release-ready branding and metadata.
- Working build configuration.
- Final QA checklist and polish fixes.

## Acceptance Criteria

- Preview and production builds succeed.
- The app installs cleanly on a device.
- The About and license information is available in-app.
- Theme and language controls work instantly.
- The app no longer depends on placeholder branding or placeholder metadata.

## Constraints

- Treat this as the final stabilization phase.
- Avoid introducing new major features here.
