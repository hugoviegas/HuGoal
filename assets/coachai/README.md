# CoachAI image pipeline

## Folder structure

- `assets/coachai/reference/models/male/` - put the male athlete reference image(s) here.
- `assets/coachai/reference/models/female/` - put the female athlete reference image(s) here.
- `assets/coachai/reference/equipment/` - generated equipment-only reference images.
- `assets/coachai/output/` - generated exercise images.
- `assets/coachai/state/` - manifests and progress state.
- `assets/coachai/prompts/` - saved prompt text for each generated image.
- `assets/coachai/dashboard.html` - simple visual dashboard for references, outputs and errors.

## Naming rules

- Output files follow: `<exercise-slug>__<angle>__<avatar>__<stage>.png`
- Stage values: `start` and `end`
- Existing files are skipped by default so the script can be re-run safely.

## Reference workflow

- The start image uses the athlete reference image as the main identity anchor.
- The end image uses the generated start image as the first reference image.
- Equipment references are generated once and then reused across exercises.

## Model and equipment generation

- The pipeline can generate base model references from zero for `male` and `female`.
- Equipment references are generated once per equipment name and skipped if the file already exists.
- Use:

```bash
python scripts/generate_exercises.py --prepare-only
```

This generates:

- base model references in `assets/coachai/reference/models/<avatar>/`
- equipment references in `assets/coachai/reference/equipment/`

## Incremental exercise generation

Generate one by one (no duplicates by default):

```bash
python scripts/generate_exercises.py --limit 1 --avatar male --stage both
python scripts/generate_exercises.py --limit 1 --avatar female --stage both
```

By default existing files are skipped. Use `--overwrite` only when you want regeneration.

## Dashboard usage

Start the local dashboard server:

```bash
python scripts/coachai_dashboard_server.py
```

Open:

```text
http://localhost:8787/assets/coachai/dashboard.html
```

The dashboard can now generate a single image directly through the local API server and show the returned image in the preview panel.

If you want real generation instead of dry-run output, set `REPLICATE_API_TOKEN` in your environment before starting the server.

## pip note (Windows)

`Defaulting to user installation because normal site-packages is not writeable` is normal on Windows and not an error.
If `pip install` appears frozen for a long time, try:

```bash
python -m pip install --upgrade pip
python -m pip install -r scripts/requirements.txt --progress-bar off --disable-pip-version-check
```
