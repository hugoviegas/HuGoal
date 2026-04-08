#!/usr/bin/env python3
"""Local dashboard server for CoachAI image generation."""

from __future__ import annotations

import argparse
import json
import sys
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT_DIR / "scripts"

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import coachai_image_pipeline as pipeline  # noqa: E402


def to_public_url(path_value: str | None) -> str:
    if not path_value:
        return ""
    normalized = str(path_value).replace("\\", "/")
    if normalized.startswith("/"):
        return normalized
    return f"/{normalized}"


def load_manifest(path: Path) -> list[dict]:
    payload = pipeline.load_state(path)
    return payload if isinstance(payload, list) else []


def upsert_manifest(path: Path, entry: dict) -> None:
    payload = load_manifest(path)
    key = (entry.get("kind"), entry.get("output"), entry.get("avatar"), entry.get("stage"))
    filtered = [
        item
        for item in payload
        if (item.get("kind"), item.get("output"), item.get("avatar"), item.get("stage")) != key
    ]
    filtered.append(entry)
    pipeline.save_json(path, filtered)


def list_equipment_names(exercises: list[dict]) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    for exercise in exercises:
        for item in exercise.get("equipment", []) or []:
            name = pipeline.normalize_name(str(item))
            if name and name not in seen:
                seen.add(name)
                names.append(name)
    return names


def result_to_public_path(result: dict) -> str:
    output_value = result.get("output")
    return to_public_url(output_value)


def ensure_references(
    exercises: list[dict],
    avatars: list[str],
    client: object | None,
    dry_run: bool,
    include_models: bool = True,
    include_equipment: bool = True,
    selected_exercise: dict | None = None,
) -> list[dict]:
    pipeline.ensure_directories()
    results: list[dict] = []

    if include_models:
        for avatar in avatars:
            result = pipeline.generate_model_reference(client, avatar, overwrite=False, dry_run=dry_run)
            upsert_manifest(pipeline.MODEL_MANIFEST_PATH, result)
            results.append(result)

    if include_equipment:
        source_exercises = [selected_exercise] if selected_exercise else exercises
        equipment_names = list_equipment_names([exercise for exercise in source_exercises if exercise])
        for equipment_name in equipment_names:
            result = pipeline.generate_equipment_reference(client, equipment_name, overwrite=False, dry_run=dry_run)
            upsert_manifest(pipeline.EQUIPMENT_MANIFEST_PATH, result)
            results.append(result)

    return results


class CoachAIDashboardHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def do_GET(self):  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path in {"/", "/dashboard"}:
            self.send_response(HTTPStatus.FOUND)
            self.send_header("Location", "/assets/coachai/dashboard.html")
            self.end_headers()
            return

        if parsed.path == "/api/library":
            self.send_json(self.build_library())
            return

        super().do_GET()

    def do_POST(self):  # noqa: N802
        parsed = urlparse(self.path)
        payload = self.read_json_body()

        if parsed.path == "/api/prepare":
            self.send_json(self.handle_prepare(payload))
            return

        if parsed.path == "/api/generate":
            self.send_json(self.handle_generate(payload))
            return

        if parsed.path == "/api/generate-equipment":
            self.send_json(self.handle_generate_equipment(payload))
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Unknown API route")

    def build_library(self) -> dict:
        exercises = pipeline.load_json_dataset(pipeline.DATASET_PATH)
        return {
            "exercises": exercises,
            "manifests": {
                "models": load_manifest(pipeline.MODEL_MANIFEST_PATH),
                "equipment": load_manifest(pipeline.EQUIPMENT_MANIFEST_PATH),
                "images": load_manifest(pipeline.IMAGE_MANIFEST_PATH),
                "errors": load_manifest(pipeline.ERRORS_MANIFEST_PATH),
            },
            "config": {
                "apiTokenPresent": bool(pipeline.client_from_env()),
                "referenceRoot": to_public_url(str(pipeline.REFERENCE_ROOT.relative_to(ROOT_DIR))),
                "outputRoot": to_public_url(str(pipeline.OUTPUT_ROOT.relative_to(ROOT_DIR))),
            },
        }

    def handle_prepare(self, payload: dict) -> dict:
        exercises = pipeline.load_json_dataset(pipeline.DATASET_PATH)
        client = pipeline.client_from_env()
        dry_run = bool(payload.get("dryRun", False)) or client is None
        avatar_choice = str(payload.get("avatar", "all"))
        avatars = ["male", "female"] if avatar_choice == "all" else [avatar_choice]

        results = ensure_references(
            exercises=exercises,
            avatars=avatars,
            client=client,
            dry_run=dry_run,
            include_models=not bool(payload.get("skipModels", False)),
            include_equipment=not bool(payload.get("skipEquipment", False)),
        )

        return {
            "ok": True,
            "mode": "dry-run" if dry_run else "replicate",
            "results": results,
            "manifests": self.build_library()["manifests"],
        }

    def handle_generate(self, payload: dict) -> dict:
        exercises = pipeline.load_json_dataset(pipeline.DATASET_PATH)
        exercise_id = int(payload.get("exerciseId", 0))
        selected_exercise = next((exercise for exercise in exercises if int(exercise.get("id", 0)) == exercise_id), None)
        if selected_exercise is None:
            return {"ok": False, "error": f"Exercise {exercise_id} not found."}

        client = pipeline.client_from_env()
        dry_run = bool(payload.get("dryRun", False)) or client is None
        avatar_choice = str(payload.get("avatar", "male"))
        avatars = ["male", "female"] if avatar_choice == "all" else [avatar_choice]
        stage_choice = str(payload.get("stage", "both"))
        stages = ["start", "end"] if stage_choice == "both" else [stage_choice]
        overwrite = bool(payload.get("overwrite", False))

        prepare_refs = bool(payload.get("prepareRefs", True))
        if prepare_refs:
            ensure_references(
                exercises=exercises,
                avatars=avatars,
                client=client,
                dry_run=dry_run,
                include_models=True,
                include_equipment=True,
                selected_exercise=selected_exercise,
            )

        results: list[dict] = []
        for avatar in avatars:
            for stage in stages:
                if stage == "end" and not dry_run:
                    start_path = pipeline.build_output_path(selected_exercise, avatar, pipeline.angle_for_exercise(selected_exercise), "start")
                    if not pipeline.output_exists(start_path):
                        start_result = pipeline.generate_exercise_image(client, selected_exercise, avatar, "start", overwrite, dry_run)
                        upsert_manifest(pipeline.IMAGE_MANIFEST_PATH, start_result)
                        results.append(start_result)

                result = pipeline.generate_exercise_image(client, selected_exercise, avatar, stage, overwrite, dry_run)
                upsert_manifest(pipeline.IMAGE_MANIFEST_PATH, result)
                results.append(result)

        latest_generated = next((result for result in reversed(results) if result.get("status") == "generated"), results[-1] if results else None)
        latest_image = result_to_public_path(latest_generated) if latest_generated else ""

        return {
            "ok": True,
            "mode": "dry-run" if dry_run else "replicate",
            "results": results,
            "latestImageUrl": latest_image,
            "exercise": selected_exercise,
            "manifests": self.build_library()["manifests"],
        }

    def handle_generate_equipment(self, payload: dict) -> dict:
        exercises = pipeline.load_json_dataset(pipeline.DATASET_PATH)
        equipment_name = payload.get("equipmentName")
        if not equipment_name:
            return {"ok": False, "error": "equipmentName is required"}

        client = pipeline.client_from_env()
        dry_run = bool(payload.get("dryRun", False)) or client is None
        overwrite = bool(payload.get("overwrite", False))

        result = pipeline.generate_equipment_reference(client, equipment_name, overwrite, dry_run)
        upsert_manifest(pipeline.EQUIPMENT_MANIFEST_PATH, result)

        latest_image = to_public_url(result.get("output")) if result.get("output") else ""

        return {
            "ok": True,
            "mode": "dry-run" if dry_run else "replicate",
            "result": result,
            "latestImageUrl": latest_image,
            "manifests": self.build_library()["manifests"],
        }

    def read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0:
            return {}
        raw = self.rfile.read(content_length)
        if not raw:
            return {}
        try:
            payload = json.loads(raw.decode("utf-8"))
            return payload if isinstance(payload, dict) else {}
        except json.JSONDecodeError:
            return {}

    def send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        encoded = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Serve the CoachAI dashboard and generation APIs.")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind.")
    parser.add_argument("--port", default=8787, type=int, help="Port to listen on.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    pipeline.ensure_directories()
    server = ThreadingHTTPServer((args.host, args.port), CoachAIDashboardHandler)
    print(f"CoachAI dashboard server running at http://{args.host}:{args.port}/assets/coachai/dashboard.html")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())