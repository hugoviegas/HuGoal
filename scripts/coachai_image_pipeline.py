#!/usr/bin/env python3
"""CoachAI image pipeline for exercise renders.

Uses Flux 2 Pro on Replicate to generate deterministic exercise images with:
- local athlete reference images for male/female
- equipment-only reference images on a pure white background
- start/end generation per exercise
- stable output names and skip-existing behavior
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import textwrap
from contextlib import ExitStack
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import requests

try:
    import replicate
except Exception:  # pragma: no cover - handled at runtime
    replicate = None


ROOT_DIR = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT_DIR / "docs" / "prototype_files" / "coachAI_exercises.json"
COACHAI_ROOT = ROOT_DIR / "assets" / "coachai"
REFERENCE_ROOT = COACHAI_ROOT / "reference"
MODEL_REFERENCE_ROOT = REFERENCE_ROOT / "models"
EQUIPMENT_REFERENCE_ROOT = REFERENCE_ROOT / "equipment"
OUTPUT_ROOT = COACHAI_ROOT / "output"
STATE_ROOT = COACHAI_ROOT / "state"
PROMPT_ROOT = COACHAI_ROOT / "prompts"

EQUIPMENT_MANIFEST_PATH = STATE_ROOT / "equipment_manifest.json"
MODEL_MANIFEST_PATH = STATE_ROOT / "model_manifest.json"
IMAGE_MANIFEST_PATH = STATE_ROOT / "image_manifest.json"
ERRORS_MANIFEST_PATH = STATE_ROOT / "errors.json"
PIPELINE_STATE_PATH = STATE_ROOT / "pipeline_state.json"

MODEL_NAME = "black-forest-labs/flux-2-pro"
MAX_REFERENCE_IMAGES = 8

CATEGORY_EN = {
    "Peito": "Chest",
    "Costas": "Back",
    "Ombros": "Shoulders",
    "Bíceps": "Biceps",
    "Tríceps": "Triceps",
    "Quadríceps": "Quadriceps",
    "Isquiotibiais": "Hamstrings",
    "Glúteos": "Glutes",
    "Panturrilha": "Calves",
    "Core": "Core",
    "Cardio": "Cardio",
    "Corpo Inteiro": "Full Body",
    "Antebraço": "Forearms",
    "Mobilidade": "Mobility",
    "Trapézio": "Trapezius",
    "Adutores": "Adductors",
    "Pescoço": "Neck",
    "Yoga": "Yoga",
}

TYPE_EN = {
    "Composto": "Compound",
    "Força": "Strength",
    "Isolamento": "Isolation",
    "Isométrico": "Isometric",
    "Cardio": "Cardio",
    "Pliométrico": "Plyometric",
    "Funcional": "Functional",
    "Mobilidade": "Mobility",
    "Recuperação": "Recovery",
}

MUSCLE_EN = {
    "Peitoral Maior": "pectoralis major",
    "Peitoral Superior": "upper chest",
    "Peitoral Inferior": "lower chest",
    "Peitoral": "chest",
    "Deltoide": "deltoid",
    "Deltoide Anterior": "anterior deltoid",
    "Deltoide Lateral": "lateral deltoid",
    "Deltoide Médio": "lateral deltoid",
    "Deltoide Posterior": "rear deltoid",
    "Latíssimo do Dorso": "latissimus dorsi",
    "Romboides": "rhomboids",
    "Eretores da Espinha": "spinal erectors",
    "Eretores": "spinal erectors",
    "Trapézio": "trapezius",
    "Trapézio Superior": "upper trapezius",
    "Bíceps Braquial": "biceps brachii",
    "Braquial": "brachialis",
    "Braquiorradial": "brachioradialis",
    "Tríceps Braquial": "triceps brachii",
    "Tríceps": "triceps",
    "Quadríceps": "quadriceps",
    "Isquiotibiais": "hamstrings",
    "Glúteo Máximo": "gluteus maximus",
    "Glúteo Médio": "gluteus medius",
    "Glúteo Mínimo": "gluteus minimus",
    "Gastrocnêmio": "gastrocnemius",
    "Sóleo": "soleus",
    "Core": "core",
    "Core (Transverso)": "transverse core",
    "Transverso Abdominal": "transverse abdominis",
    "Reto Abdominal": "rectus abdominis",
    "Reto Abdominal Inferior": "lower rectus abdominis",
    "Oblíquos": "obliques",
    "Flexores do Quadril": "hip flexors",
    "Quadratus Lumborum": "quadratus lumborum",
    "Adutores": "adductors",
    "Flexores do Antebraço": "forearm flexors",
    "Extensores do Antebraço": "forearm extensors",
    "Antebraço": "forearm",
    "Esternocleidomastoideo": "sternocleidomastoid",
    "Tornozelo": "ankle stabilizers",
    "Quadril": "hips",
    "Torácica": "thoracic spine",
    "Coluna Torácica": "thoracic spine",
    "Coluna": "spine",
    "Pescoço": "neck",
    "Piriforme": "piriformis",
    "Levantador da Escápula": "levator scapulae",
    "Serrátil Anterior": "serratus anterior",
    "Dorsais": "lats",
    "Braços": "arms",
    "Ombros": "shoulders",
    "Cardio": "cardio",
    "Corpo Inteiro": "full body",
    "Peito": "chest",
    "Costas": "back",
}

EQUIPMENT_EN = {
    "Barra": "Olympic barbell",
    "Halteres": "pair of dumbbells",
    "Banco": "flat weight bench",
    "Banco Inclinado": "adjustable incline bench",
    "Banco Declinado": "decline bench",
    "Banco Scott": "preacher curl bench",
    "Banco Romano": "Roman chair bench",
    "Cabo/Polia": "cable pulley station",
    "Barra Fixa": "pull-up bar",
    "Barras Paralelas": "parallel dip bars",
    "Máquina": "commercial gym machine",
    "Kettlebell": "kettlebell",
    "Faixa Elástica": "loop resistance band",
    "Faixa": "resistance strap",
    "Argolas": "gymnastic rings",
    "Bola Suíça": "Swiss ball",
    "Medicine Ball": "medicine ball",
    "Caixote": "plyo box",
    "Roda Abdominal": "ab wheel",
    "Rolo de Espuma": "foam roller",
    "Corda": "jump rope",
    "Cordas de Batalha": "battle ropes",
    "Remo Ergométrico": "rowing machine",
    "Bicicleta Ergométrica": "stationary bike",
    "StairMaster": "stair climber machine",
    "Escada de Agilidade": "agility ladder",
    "T-Bar": "T-bar row platform",
    "Paralelas": "low parallel bars",
    "Barra Vertical": "vertical pole",
    "Placa": "weight plate",
    "Peso Livre": "free weight",
    "Chão": "studio floor",
}

ANGLE_LIBRARY = {
    "front": "Camera angle: direct front view, eye-level, full body centered, all limbs visible, clean studio framing.",
    "diag-front": "Camera angle: 45-degree front diagonal, eye-level, full body centered, clear depth and muscle definition.",
    "side": "Camera angle: perfect side view, eye-level, full body centered, clean silhouette and posture visibility.",
    "diag-back": "Camera angle: 45-degree back diagonal, eye-level, full body centered, posterior chain clearly visible.",
    "back": "Camera angle: direct back view, eye-level, full body centered, back and glute line clearly visible.",
    "top-down": "Camera angle: slightly elevated high angle, centered, full body visible, still realistic and instructional.",
}

PHASE_LIBRARY = {
    "start": "Starting position, before the main effort begins.",
    "end": "Final position, end of motion, stable finish with the target muscles fully expressed.",
    "mid": "Mid range of motion, controlled and balanced tension.",
    "peak": "Peak contraction, strongest visible effort in the target muscles.",
    "eccentric": "Eccentric phase, controlled lowering under tension.",
    "concentric": "Concentric phase, strong controlled lift or pull.",
    "hold": "Isometric hold, stable tension without movement.",
    "prep": "Preparation position, stable and ready to move.",
    "active": "Active movement phase, clear motion and athletic energy.",
    "flight": "Explosive flight or peak power moment.",
    "land": "Landing or absorption phase, controlled and athletic.",
    "exec": "Active execution of the movement pattern.",
    "finish": "Finish position, stable end of the movement.",
    "entry": "Entering the stretch or mobility position.",
    "full": "Full stretch or full range position.",
    "apply": "Recovery application position, focused and controlled.",
}

MODEL_BASE_PROMPTS = {
    "male": textwrap.dedent(
        """
        Photorealistic full-body studio portrait of a fit male fitness athlete.
        Pose: standing upright, facing the camera directly, shoulders squared, neutral expression, feet hip-width apart, arms relaxed at sides.
        Identity anchor: same face, same hairline, same skin tone, same body proportions across future renders.
        Outfit lock: dark athletic shorts and plain white training sneakers.
        Scene: pure seamless white cyclorama background and floor.
        Lighting: locked three-point studio setup, neutral white balance, consistent exposure.
        Framing: full body portrait, tall vertical crop (9:16), entire body visible, eye-level camera, 50mm lens rendering.
        Visual style: ultra-realistic commercial fitness portrait, no logos, no text, no accessories.
        """
    ).strip(),
    "female": textwrap.dedent(
        """
        Photorealistic full-body studio portrait of a fit female fitness athlete.
        Pose: standing upright, facing the camera directly, shoulders squared, neutral expression, feet hip-width apart, arms relaxed at sides.
        Identity anchor: same face, same hair, same skin tone, same body proportions across future renders.
        Outfit lock: dark athletic top, dark fitted shorts or leggings, and plain white training sneakers.
        Scene: pure seamless white cyclorama background and floor.
        Lighting: locked three-point studio setup, neutral white balance, consistent exposure.
        Framing: full body portrait, tall vertical crop (9:16), entire body visible, eye-level camera, 50mm lens rendering.
        Visual style: ultra-realistic commercial fitness portrait, no logos, no text, no accessories.
        """
    ).strip(),
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "item"


def stable_seed(*parts: str) -> int:
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def strip_json_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"(?m)//.*$", "", text)
    text = re.sub(r",(\s*[}\]])", r"\1", text)
    return text


def load_json_dataset(path: Path) -> list[dict[str, Any]]:
    cleaned = strip_json_comments(path.read_text(encoding="utf-8"))
    data = json.loads(cleaned)
    if not isinstance(data, list):
        raise RuntimeError(f"Dataset at {path} must be a JSON array.")
    return data


def ensure_directories() -> None:
    for directory in [
        MODEL_REFERENCE_ROOT / "male",
        MODEL_REFERENCE_ROOT / "female",
        EQUIPMENT_REFERENCE_ROOT,
        OUTPUT_ROOT,
        STATE_ROOT,
        PROMPT_ROOT,
    ]:
        directory.mkdir(parents=True, exist_ok=True)


def load_state(path: Path) -> Any:
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def append_list(path: Path, entry: dict[str, Any]) -> None:
    data = load_state(path)
    if not isinstance(data, list):
        data = []
    data.append(entry)
    save_json(path, data)


def normalize_name(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def translate_many(values: Iterable[str], mapping: dict[str, str]) -> list[str]:
    return [mapping.get(normalize_name(raw), normalize_name(raw)) for raw in values]


def translate_muscle(value: str) -> str:
    return MUSCLE_EN.get(normalize_name(value), normalize_name(value))


def translate_equipment(value: str) -> str:
    return EQUIPMENT_EN.get(normalize_name(value), normalize_name(value))


def category_en(value: str) -> str:
    key = normalize_name(value)
    return CATEGORY_EN.get(key, key)


def type_en(value: str) -> str:
    key = normalize_name(value)
    return TYPE_EN.get(key, key)


def angle_for_exercise(exercise: dict[str, Any]) -> str:
    category = normalize_name(str(exercise.get("category", "")))
    movement_type = normalize_name(str(exercise.get("type", "")))
    if category == "Costas":
        return "diag-back"
    if category in {"Peito", "Ombros", "Bíceps", "Tríceps", "Antebraço"}:
        return "diag-front"
    if category in {"Quadríceps", "Isquiotibiais", "Glúteos", "Panturrilha", "Adutores"}:
        return "front"
    if movement_type in {"Pliométrico", "Cardio", "Mobilidade", "Recuperação"}:
        return "front"
    return "diag-front"


def read_image_files(directory: Path) -> list[Path]:
    if not directory.exists():
        return []
    return sorted(
        path
        for path in directory.iterdir()
        if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif"}
    )


def get_avatar_reference_files(avatar: str) -> list[Path]:
    return read_image_files(MODEL_REFERENCE_ROOT / avatar)


def get_model_output_path(avatar: str) -> Path:
    return MODEL_REFERENCE_ROOT / avatar / f"{avatar}_base_reference.png"


def get_model_prompt_path(avatar: str) -> Path:
    return MODEL_REFERENCE_ROOT / avatar / f"{avatar}_base_reference.prompt.txt"


def get_model_metadata_path(avatar: str) -> Path:
    return MODEL_REFERENCE_ROOT / avatar / f"{avatar}_base_reference.json"


def get_equipment_name_set(exercises: list[dict[str, Any]]) -> list[str]:
    names = set()
    for exercise in exercises:
        for item in exercise.get("equipment", []) or []:
            names.add(normalize_name(str(item)))
    return sorted(names)


def build_equipment_prompt(name: str) -> str:
    clean_name = normalize_name(name)
    return textwrap.dedent(
        f"""
        Professional studio product render of a single {translate_equipment(clean_name)} used as a gym reference object.
        Scene: pure seamless white cyclorama studio background with a matching white floor.
        Subject: the equipment is isolated, centered, clearly recognizable, and shown without any person, hands, or body parts.
        Style: photorealistic, sharp, high-detail, commercial product photography.
        Material lock: keep the same equipment design, shape, finish, color, and proportions across generations.
        Lighting: locked three-point studio lighting with soft shadows only and consistent exposure.
        Composition: clean single-object reference image with generous whitespace around the object.
        """
    ).strip()


def build_exercise_prompt(exercise: dict[str, Any], avatar: str, stage: str, angle_key: str) -> str:
    title = normalize_name(str(exercise.get("name_en") or exercise.get("name") or "exercise"))
    local_name = normalize_name(str(exercise.get("name") or title))
    category = category_en(str(exercise.get("category", "")))
    movement_type = type_en(str(exercise.get("type", "")))
    primary = translate_muscle(str(exercise.get("muscle_primary", "")))
    secondary = translate_many([str(item) for item in exercise.get("muscle_secondary", []) or []], MUSCLE_EN)
    equipment = [translate_equipment(str(item)) for item in exercise.get("equipment", []) or []]
    angle = ANGLE_LIBRARY.get(angle_key, ANGLE_LIBRARY["diag-front"])
    phase_text = PHASE_LIBRARY.get(stage, PHASE_LIBRARY["start"])

    if avatar == "male":
        identity = (
            "Same athletic male fitness athlete as the reference image. Same face, same hair, same skin tone, "
            "same body proportions, same dark shorts, same plain white training sneakers, same lean muscular look."
        )
    else:
        identity = (
            "Same athletic female fitness athlete as the reference image. Same face, same hair, same skin tone, "
            "same body proportions, same dark athletic outfit, same plain white training sneakers, same toned look."
        )

    equipment_text = ", ".join(equipment) if equipment else "bodyweight only"
    reference_mode = "base-athlete-reference" if stage == "start" else "generated-start-image-reference"

    prompt_payload = {
        "scene": "professional fitness studio photograph",
        "background": "pure seamless white cyclorama, matching white floor and wall, no color cast",
        "lighting": "locked three-point studio lighting with a soft key light from upper-left, balanced fill light from the right, and subtle rim light for separation",
        "camera": {
            "angle": angle,
            "framing": "full body centered, all hands and feet visible, no crop",
            "lens": "50mm full-frame equivalent",
        },
        "subject": {
            "identity": identity,
            "wardrobe": "Keep the exact same clothing colors, fit, fabric texture, and sneaker model as the reference image.",
            "equipment_style": f"Keep the exact same equipment design, color, material, and proportions for {equipment_text}.",
        },
        "exercise": {
            "id": exercise.get("id"),
            "name_en": title,
            "name_local": local_name,
            "category": category,
            "movement_type": movement_type,
            "target_muscle_primary": primary,
            "target_muscles_secondary": secondary,
            "equipment": equipment,
            "phase": stage,
            "phase_description": phase_text,
            "reference_mode": reference_mode,
        },
        "quality": {
            "style": "photorealistic, high fidelity, crisp texture detail, realistic anatomy, instructional fitness reference",
            "visual_locks": [
                "single athlete centered in the frame",
                "same athlete identity across images",
                "same outfit and shoes across images",
                "same equipment design and color across images",
                "same white background and lighting across images",
                "clean logo-free studio look",
                "only the requested equipment in view",
            ],
        },
        "reference_workflow": (
            "For the start image, use the athlete reference image as the primary identity anchor. "
            "For the end image, use the previously generated start image as the first reference image and preserve the same athlete, outfit, lighting, and equipment style."
        ),
    }
    return json.dumps(prompt_payload, ensure_ascii=False, indent=2)


def build_output_path(exercise: dict[str, Any], avatar: str, angle_key: str, stage: str) -> Path:
    slug = slugify(f"{int(exercise.get('id', 0)):03d}-{exercise.get('name_en') or exercise.get('name')}")
    return OUTPUT_ROOT / avatar / slug / f"{slug}__{angle_key}__{avatar}__{stage}.png"


def build_prompt_path(output_path: Path) -> Path:
    return PROMPT_ROOT / output_path.relative_to(OUTPUT_ROOT).with_suffix(".prompt.txt")


def build_metadata_path(output_path: Path) -> Path:
    return output_path.with_suffix(".json")


def output_exists(path: Path) -> bool:
    return path.exists() and path.stat().st_size > 0


def client_from_env() -> Any:
    token = os.getenv("REPLICATE_API_TOKEN", "").strip()
    if not token or replicate is None:
        return None
    return replicate.Client(api_token=token)


def run_model(
    client: Any,
    prompt: str,
    input_images: list[Path],
    seed: int,
    *,
    resolution: str = "1 MP",
    aspect_ratio: str | None = None,
    output_format: str = "webp",
    output_quality: int = 80,
    safety_tolerance: int = 2,
) -> str:
    """
    Run the configured replicate model and return the URL of the generated asset.

    Defaults are tuned for portrait-oriented high-detail references (9:16, webp).
    """
    payload: dict[str, Any] = {
        "prompt": prompt,
        "resolution": resolution,
        "seed": seed,
        "output_format": output_format,
        "output_quality": output_quality,
        "safety_tolerance": safety_tolerance,
    }
    if aspect_ratio is None:
        payload["aspect_ratio"] = "match_input_image" if input_images else "1:1"
    else:
        payload["aspect_ratio"] = aspect_ratio

    with ExitStack() as stack:
        opened = [stack.enter_context(path.open("rb")) for path in input_images[:MAX_REFERENCE_IMAGES]]
        if opened:
            payload["input_images"] = opened
        output = client.run(MODEL_NAME, input=payload)

    if isinstance(output, list):
        return str(output[0])
    return str(output)


def download_image(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    destination.write_bytes(response.content)


def save_artifacts(output_path: Path, prompt_path: Path, metadata_path: Path, prompt: str, metadata: dict[str, Any]) -> None:
    prompt_path.parent.mkdir(parents=True, exist_ok=True)
    prompt_path.write_text(prompt, encoding="utf-8")
    save_json(metadata_path, metadata)


def generate_equipment_reference(client: Any, equipment_name: str, overwrite: bool, dry_run: bool) -> dict[str, Any]:
    equipment_slug = slugify(equipment_name)
    output_path = EQUIPMENT_REFERENCE_ROOT / f"{equipment_slug}.webp"
    prompt_path = EQUIPMENT_REFERENCE_ROOT / f"{equipment_slug}.prompt.txt"
    metadata_path = EQUIPMENT_REFERENCE_ROOT / f"{equipment_slug}.json"
    prompt = build_equipment_prompt(equipment_name)
    seed = stable_seed("equipment", equipment_name)

    if output_exists(output_path) and not overwrite:
        result = {
            "kind": "equipment",
            "name": equipment_name,
            "output": str(output_path.relative_to(ROOT_DIR)),
            "status": "skipped-existing",
            "seed": seed,
        }
        save_artifacts(output_path, prompt_path, metadata_path, prompt, result)
        return result

    if dry_run or client is None:
        result = {
            "kind": "equipment",
            "name": equipment_name,
            "output": str(output_path.relative_to(ROOT_DIR)),
            "status": "dry-run",
            "seed": seed,
        }
        save_artifacts(output_path, prompt_path, metadata_path, prompt, result)
        return result

    image_url = run_model(client, prompt, [], seed, aspect_ratio="9:16", output_format="webp", output_quality=80)
    download_image(image_url, output_path)
    result = {
        "kind": "equipment",
        "name": equipment_name,
        "output": str(output_path.relative_to(ROOT_DIR)),
        "status": "generated",
        "seed": seed,
        "image_url": image_url,
    }
    save_artifacts(output_path, prompt_path, metadata_path, prompt, result)
    return result


def get_model_output_path(avatar: str) -> Path:
    return MODEL_REFERENCE_ROOT / avatar / f"{avatar}_base_reference.webp"


def generate_model_reference(client: Any, avatar: str, overwrite: bool, dry_run: bool) -> dict[str, Any]:
    output_path = get_model_output_path(avatar)
    prompt_path = get_model_prompt_path(avatar)
    metadata_path = get_model_metadata_path(avatar)
    prompt = MODEL_BASE_PROMPTS[avatar]
    seed = stable_seed("model", avatar)

    if output_exists(output_path) and not overwrite:
        result = {
            "kind": "model",
            "avatar": avatar,
            "output": str(output_path.relative_to(ROOT_DIR)),
            "status": "skipped-existing",
            "seed": seed,
        }
        save_artifacts(output_path, prompt_path, metadata_path, prompt, result)
        return result

    if dry_run or client is None:
        result = {
            "kind": "model",
            "avatar": avatar,
            "output": str(output_path.relative_to(ROOT_DIR)),
            "status": "dry-run",
            "seed": seed,
        }
        save_artifacts(output_path, prompt_path, metadata_path, prompt, result)
        return result

    image_url = run_model(
        client,
        prompt,
        [],
        seed,
        aspect_ratio="9:16",
        output_format="webp",
        output_quality=80,
    )
    download_image(image_url, output_path)
    result = {
        "kind": "model",
        "avatar": avatar,
        "output": str(output_path.relative_to(ROOT_DIR)),
        "status": "generated",
        "seed": seed,
        "image_url": image_url,
    }
    save_artifacts(output_path, prompt_path, metadata_path, prompt, result)
    return result


def gather_equipment_refs(equipment_names: list[str]) -> list[Path]:
    refs = []
    for name in equipment_names:
        path = EQUIPMENT_REFERENCE_ROOT / f"{slugify(name)}.png"
        if output_exists(path):
            refs.append(path)
    return refs


def build_input_refs(avatar: str, stage: str, exercise: dict[str, Any], angle_key: str) -> list[Path]:
    refs = get_avatar_reference_files(avatar)
    equipment_names = [normalize_name(str(item)) for item in exercise.get("equipment", []) or []]
    refs.extend(gather_equipment_refs(equipment_names))
    if stage == "end":
        start_path = build_output_path(exercise, avatar, angle_key, "start")
        if output_exists(start_path):
            refs = [start_path] + refs
    return refs[:MAX_REFERENCE_IMAGES]


def generate_exercise_image(client: Any, exercise: dict[str, Any], avatar: str, stage: str, overwrite: bool, dry_run: bool) -> dict[str, Any]:
    angle_key = angle_for_exercise(exercise)
    output_path = build_output_path(exercise, avatar, angle_key, stage)
    prompt_path = build_prompt_path(output_path)
    metadata_path = build_metadata_path(output_path)
    prompt = build_exercise_prompt(exercise, avatar, stage, angle_key)
    refs = build_input_refs(avatar, stage, exercise, angle_key)
    seed = stable_seed(str(exercise.get("id")), avatar, stage, angle_key)

    if output_exists(output_path) and not overwrite:
        result = {
            "kind": "exercise",
            "id": exercise.get("id"),
            "name": exercise.get("name_en") or exercise.get("name"),
            "avatar": avatar,
            "stage": stage,
            "angle": angle_key,
            "output": str(output_path.relative_to(ROOT_DIR)),
            "status": "skipped-existing",
            "seed": seed,
            "references": [str(path.relative_to(ROOT_DIR)) for path in refs],
        }
        save_artifacts(output_path, prompt_path, metadata_path, prompt, result)
        return result

    if dry_run or client is None:
        result = {
            "kind": "exercise",
            "id": exercise.get("id"),
            "name": exercise.get("name_en") or exercise.get("name"),
            "avatar": avatar,
            "stage": stage,
            "angle": angle_key,
            "output": str(output_path.relative_to(ROOT_DIR)),
            "status": "dry-run",
            "seed": seed,
            "references": [str(path.relative_to(ROOT_DIR)) for path in refs],
        }
        save_artifacts(output_path, prompt_path, metadata_path, prompt, result)
        return result

    image_url = run_model(client, prompt, refs, seed)
    download_image(image_url, output_path)
    result = {
        "kind": "exercise",
        "id": exercise.get("id"),
        "name": exercise.get("name_en") or exercise.get("name"),
        "avatar": avatar,
        "stage": stage,
        "angle": angle_key,
        "output": str(output_path.relative_to(ROOT_DIR)),
        "status": "generated",
        "seed": seed,
        "image_url": image_url,
        "references": [str(path.relative_to(ROOT_DIR)) for path in refs],
    }
    save_artifacts(output_path, prompt_path, metadata_path, prompt, result)
    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate CoachAI exercise images with Flux 2 Pro.")
    parser.add_argument("--dataset", default=str(DATASET_PATH), help="Path to the exercise dataset JSON file.")
    parser.add_argument("--avatar", choices=["male", "female", "all"], default="all", help="Which avatar to generate.")
    parser.add_argument("--stage", choices=["start", "end", "both"], default="both", help="Which stage(s) to generate for each exercise.")
    parser.add_argument("--limit", type=int, default=0, help="Limit the number of exercises processed.")
    parser.add_argument("--offset", type=int, default=0, help="Skip the first N exercises.")
    parser.add_argument("--exercise-id", type=int, default=0, help="Generate a single exercise by numeric id.")
    parser.add_argument("--overwrite", action="store_true", help="Regenerate even if the output file already exists.")
    parser.add_argument("--dry-run", action="store_true", help="Write prompts and manifests without calling Replicate.")
    parser.add_argument("--skip-models", action="store_true", help="Skip base model reference generation.")
    parser.add_argument("--skip-equipment", action="store_true", help="Skip equipment reference generation.")
    parser.add_argument("--prepare-only", action="store_true", help="Generate model and equipment references only, then stop.")
    return parser.parse_args()


def filter_exercises(exercises: list[dict[str, Any]], args: argparse.Namespace) -> list[dict[str, Any]]:
    filtered = exercises
    if args.exercise_id:
        filtered = [exercise for exercise in filtered if int(exercise.get("id", 0)) == args.exercise_id]
    if args.offset:
        filtered = filtered[args.offset :]
    if args.limit:
        filtered = filtered[: args.limit]
    return filtered


def resolve_avatars(choice: str) -> list[str]:
    return ["male", "female"] if choice == "all" else [choice]


def print_header(exercises_count: int, avatar_choice: str, stage_choice: str, dry_run: bool, client_ready: bool) -> None:
    print("CoachAI Image Pipeline")
    print(f"- dataset exercises: {exercises_count}")
    print(f"- avatars: {avatar_choice}")
    print(f"- stages: {stage_choice}")
    print(f"- mode: {'dry-run' if dry_run or not client_ready else 'replicate'}")
    print(f"- output: {OUTPUT_ROOT.relative_to(ROOT_DIR)}")
    print(f"- equipment refs: {EQUIPMENT_REFERENCE_ROOT.relative_to(ROOT_DIR)}")
    print(f"- model refs: {MODEL_REFERENCE_ROOT.relative_to(ROOT_DIR)}")


def main() -> int:
    args = parse_args()
    ensure_directories()

    dataset_path = Path(args.dataset)
    exercises = filter_exercises(load_json_dataset(dataset_path), args)
    avatars = resolve_avatars(args.avatar)
    stages = ["start", "end"] if args.stage == "both" else [args.stage]
    client = client_from_env()
    dry_run = args.dry_run or client is None

    print_header(len(exercises), args.avatar, args.stage, dry_run, client is not None)

    if not args.skip_models:
        model_avatars = avatars if args.avatar != "all" else ["male", "female"]
        print(f"Preparing {len(model_avatars)} base model reference image(s)...")
        for index, avatar in enumerate(model_avatars, start=1):
            result = generate_model_reference(client, avatar, args.overwrite, dry_run)
            append_list(MODEL_MANIFEST_PATH, result)
            print(f"[{index:03d}/{len(model_avatars):03d}] {avatar} model -> {result['status']}")

    if not args.skip_equipment:
        equipment_names = get_equipment_name_set(exercises)
        if equipment_names:
            print(f"Preparing {len(equipment_names)} equipment reference images...")
            for index, equipment_name in enumerate(equipment_names, start=1):
                result = generate_equipment_reference(client, equipment_name, args.overwrite, dry_run)
                append_list(EQUIPMENT_MANIFEST_PATH, result)
                print(f"[{index:03d}/{len(equipment_names):03d}] {equipment_name} -> {result['status']}")

    if args.prepare_only:
        print("Prepare-only mode complete (models and equipment).")
        return 0

    state = {
        "last_run_at": now_iso(),
        "dataset": str(dataset_path),
        "exercises_total": len(exercises),
        "avatars": avatars,
        "stages": stages,
    }
    save_json(PIPELINE_STATE_PATH, state)

    total_jobs = len(exercises) * len(avatars) * len(stages)
    completed = 0

    for exercise in exercises:
        for avatar in avatars:
            for stage in stages:
                completed += 1
                output_path = build_output_path(exercise, avatar, angle_for_exercise(exercise), stage)
                try:
                    result = generate_exercise_image(client, exercise, avatar, stage, args.overwrite, dry_run)
                    append_list(IMAGE_MANIFEST_PATH, result)
                    print(
                        f"OK   [{completed:03d}/{total_jobs:03d}] {exercise.get('name_en') or exercise.get('name')} | {avatar} | {stage} -> {output_path.relative_to(ROOT_DIR)}"
                    )
                except Exception as exc:  # pragma: no cover - runtime safety
                    error_entry = {
                        "kind": "exercise",
                        "id": exercise.get("id"),
                        "name": exercise.get("name_en") or exercise.get("name"),
                        "avatar": avatar,
                        "stage": stage,
                        "angle": angle_for_exercise(exercise),
                        "output": str(output_path.relative_to(ROOT_DIR)),
                        "error": str(exc),
                        "timestamp": now_iso(),
                    }
                    append_list(ERRORS_MANIFEST_PATH, error_entry)
                    print(
                        f"ERR  [{completed:03d}/{total_jobs:03d}] {exercise.get('name_en') or exercise.get('name')} | {avatar} | {stage} -> {exc}"
                    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())