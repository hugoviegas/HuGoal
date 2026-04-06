/* eslint-disable */
// Generated from docs/prototype_files/coachAI-muscle-map-v2.html
// Do not edit manually.

import type { Exercise } from "@/types";

export type OfficialExerciseRecord = Exercise & {
  category: string;
  muscle_primary: string;
  muscle_secondary: string[];
  training_style: string[];
  type: string;
};

export const OFFICIAL_EXERCISES: OfficialExerciseRecord[] = [
  {
    "id": "barbell-bench-press",
    "name": "Supino Reto com Barra",
    "name_en": "Barbell Bench Press",
    "primary_muscles": [
      "peitoral_maior"
    ],
    "secondary_muscles": [
      "triceps",
      "deltoide_anterior"
    ],
    "equipment": [
      "barbell",
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Supino Reto com Barra",
      "Barbell Bench Press"
    ],
    "category": "Peito",
    "muscle_primary": "Peitoral Maior",
    "muscle_secondary": [
      "Tríceps",
      "Deltoide Anterior"
    ],
    "training_style": [
      "Força",
      "Hipertrofia"
    ],
    "type": "Força"
  },
  {
    "id": "incline-dumbbell-press",
    "name": "Supino Inclinado com Halteres",
    "name_en": "Incline Dumbbell Press",
    "primary_muscles": [
      "peitoral_superior"
    ],
    "secondary_muscles": [
      "triceps",
      "deltoide_anterior"
    ],
    "equipment": [
      "dumbbell",
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Supino Inclinado com Halteres",
      "Incline Dumbbell Press"
    ],
    "category": "Peito",
    "muscle_primary": "Peitoral Superior",
    "muscle_secondary": [
      "Tríceps",
      "Deltoide Anterior"
    ],
    "training_style": [
      "Força",
      "Hipertrofia"
    ],
    "type": "Força"
  },
  {
    "id": "decline-bench-press",
    "name": "Supino Declinado com Barra",
    "name_en": "Decline Bench Press",
    "primary_muscles": [
      "peitoral_inferior"
    ],
    "secondary_muscles": [
      "triceps"
    ],
    "equipment": [
      "barbell",
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Supino Declinado com Barra",
      "Decline Bench Press"
    ],
    "category": "Peito",
    "muscle_primary": "Peitoral Inferior",
    "muscle_secondary": [
      "Tríceps"
    ],
    "training_style": [
      "Força",
      "Hipertrofia"
    ],
    "type": "Força"
  },
  {
    "id": "dumbbell-fly",
    "name": "Crucifixo com Halteres",
    "name_en": "Dumbbell Fly",
    "primary_muscles": [
      "peitoral_maior"
    ],
    "secondary_muscles": [
      "deltoide_anterior"
    ],
    "equipment": [
      "dumbbell",
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Crucifixo com Halteres",
      "Dumbbell Fly"
    ],
    "category": "Peito",
    "muscle_primary": "Peitoral Maior",
    "muscle_secondary": [
      "Deltoide Anterior"
    ],
    "training_style": [
      "Hipertrofia",
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "cable-crossover",
    "name": "Crossover no Cabo",
    "name_en": "Cable Crossover",
    "primary_muscles": [
      "peitoral_maior"
    ],
    "secondary_muscles": [
      "deltoide_anterior"
    ],
    "equipment": [
      "cable"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Crossover no Cabo",
      "Cable Crossover"
    ],
    "category": "Peito",
    "muscle_primary": "Peitoral Maior",
    "muscle_secondary": [
      "Deltoide Anterior"
    ],
    "training_style": [
      "Hipertrofia",
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "push-up",
    "name": "Flexão de Braço",
    "name_en": "Push-up",
    "primary_muscles": [
      "peitoral_maior"
    ],
    "secondary_muscles": [
      "triceps",
      "core"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Flexão de Braço",
      "Push-up"
    ],
    "category": "Peito",
    "muscle_primary": "Peitoral Maior",
    "muscle_secondary": [
      "Tríceps",
      "Core"
    ],
    "training_style": [
      "Calistenia",
      "Força",
      "HIIT"
    ],
    "type": "Composto"
  },
  {
    "id": "diamond-push-up",
    "name": "Flexão Diamante",
    "name_en": "Diamond Push-up",
    "primary_muscles": [
      "triceps"
    ],
    "secondary_muscles": [
      "peitoral_maior"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Flexão Diamante",
      "Diamond Push-up"
    ],
    "category": "Peito",
    "muscle_primary": "Tríceps",
    "muscle_secondary": [
      "Peitoral Maior"
    ],
    "training_style": [
      "Calistenia",
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "archer-push-up",
    "name": "Flexão Arqueiro",
    "name_en": "Archer Push-up",
    "primary_muscles": [
      "peitoral_maior"
    ],
    "secondary_muscles": [
      "triceps",
      "biceps"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Flexão Arqueiro",
      "Archer Push-up"
    ],
    "category": "Peito",
    "muscle_primary": "Peitoral Maior",
    "muscle_secondary": [
      "Tríceps",
      "Bíceps"
    ],
    "training_style": [
      "Calistenia"
    ],
    "type": "Composto"
  },
  {
    "id": "pec-deck-machine",
    "name": "Peck Deck / Voador",
    "name_en": "Pec Deck Machine",
    "primary_muscles": [
      "peitoral_maior"
    ],
    "secondary_muscles": [],
    "equipment": [
      "machine"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Peck Deck / Voador",
      "Pec Deck Machine"
    ],
    "category": "Peito",
    "muscle_primary": "Peitoral Maior",
    "muscle_secondary": [],
    "training_style": [
      "Hipertrofia",
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "chest-dip",
    "name": "Dips no Paralelo",
    "name_en": "Chest Dip",
    "primary_muscles": [
      "peitoral_inferior"
    ],
    "secondary_muscles": [
      "triceps",
      "deltoide"
    ],
    "equipment": [
      "bodyweight"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Dips no Paralelo",
      "Chest Dip"
    ],
    "category": "Peito",
    "muscle_primary": "Peitoral Inferior",
    "muscle_secondary": [
      "Tríceps",
      "Deltoide"
    ],
    "training_style": [
      "Calistenia",
      "Força"
    ],
    "type": "Composto"
  },
  {
    "id": "pull-up",
    "name": "Barra Fixa",
    "name_en": "Pull-up",
    "primary_muscles": [
      "latissimo_do_dorso"
    ],
    "secondary_muscles": [
      "biceps",
      "romboides"
    ],
    "equipment": [
      "bodyweight"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Barra Fixa",
      "Pull-up"
    ],
    "category": "Costas",
    "muscle_primary": "Latíssimo do Dorso",
    "muscle_secondary": [
      "Bíceps",
      "Romboides"
    ],
    "training_style": [
      "Calistenia",
      "Força"
    ],
    "type": "Composto"
  },
  {
    "id": "chin-up",
    "name": "Barra Fixa Supinada",
    "name_en": "Chin-up",
    "primary_muscles": [
      "latissimo_do_dorso"
    ],
    "secondary_muscles": [
      "biceps"
    ],
    "equipment": [
      "bodyweight"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Barra Fixa Supinada",
      "Chin-up"
    ],
    "category": "Costas",
    "muscle_primary": "Latíssimo do Dorso",
    "muscle_secondary": [
      "Bíceps"
    ],
    "training_style": [
      "Calistenia",
      "Força"
    ],
    "type": "Composto"
  },
  {
    "id": "lat-pulldown",
    "name": "Pulldown na Polia",
    "name_en": "Lat Pulldown",
    "primary_muscles": [
      "latissimo_do_dorso"
    ],
    "secondary_muscles": [
      "biceps",
      "romboides"
    ],
    "equipment": [
      "cable"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Pulldown na Polia",
      "Lat Pulldown"
    ],
    "category": "Costas",
    "muscle_primary": "Latíssimo do Dorso",
    "muscle_secondary": [
      "Bíceps",
      "Romboides"
    ],
    "training_style": [
      "Hipertrofia",
      "Força"
    ],
    "type": "Composto"
  },
  {
    "id": "bent-over-barbell-row",
    "name": "Remada Curvada com Barra",
    "name_en": "Bent-Over Barbell Row",
    "primary_muscles": [
      "latissimo_do_dorso"
    ],
    "secondary_muscles": [
      "romboides",
      "biceps",
      "eretores"
    ],
    "equipment": [
      "barbell"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Remada Curvada com Barra",
      "Bent-Over Barbell Row"
    ],
    "category": "Costas",
    "muscle_primary": "Latíssimo do Dorso",
    "muscle_secondary": [
      "Romboides",
      "Bíceps",
      "Eretores"
    ],
    "training_style": [
      "Força",
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "single-arm-dumbbell-row",
    "name": "Remada com Haltere",
    "name_en": "Single-Arm Dumbbell Row",
    "primary_muscles": [
      "latissimo_do_dorso"
    ],
    "secondary_muscles": [
      "romboides",
      "biceps"
    ],
    "equipment": [
      "dumbbell",
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Remada com Haltere",
      "Single-Arm Dumbbell Row"
    ],
    "category": "Costas",
    "muscle_primary": "Latíssimo do Dorso",
    "muscle_secondary": [
      "Romboides",
      "Bíceps"
    ],
    "training_style": [
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "seated-cable-row",
    "name": "Remada Sentado no Cabo",
    "name_en": "Seated Cable Row",
    "primary_muscles": [
      "romboides"
    ],
    "secondary_muscles": [
      "latissimo_do_dorso",
      "biceps"
    ],
    "equipment": [
      "cable"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Remada Sentado no Cabo",
      "Seated Cable Row"
    ],
    "category": "Costas",
    "muscle_primary": "Romboides",
    "muscle_secondary": [
      "Latíssimo do Dorso",
      "Bíceps"
    ],
    "training_style": [
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "deadlift",
    "name": "Levantamento Terra",
    "name_en": "Deadlift",
    "primary_muscles": [
      "eretores_da_espinha"
    ],
    "secondary_muscles": [
      "gluteos",
      "isquiotibiais",
      "trapezio"
    ],
    "equipment": [
      "barbell"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Levantamento Terra",
      "Deadlift"
    ],
    "category": "Costas",
    "muscle_primary": "Eretores da Espinha",
    "muscle_secondary": [
      "Glúteos",
      "Isquiotibiais",
      "Trapézio"
    ],
    "training_style": [
      "Força",
      "Powerlifting"
    ],
    "type": "Composto"
  },
  {
    "id": "superman",
    "name": "Superman",
    "name_en": "Superman",
    "primary_muscles": [
      "eretores_da_espinha"
    ],
    "secondary_muscles": [
      "gluteos"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Superman",
      "Superman"
    ],
    "category": "Costas",
    "muscle_primary": "Eretores da Espinha",
    "muscle_secondary": [
      "Glúteos"
    ],
    "training_style": [
      "Mobilidade",
      "Calistenia"
    ],
    "type": "Isolamento"
  },
  {
    "id": "face-pull",
    "name": "Face Pull",
    "name_en": "Face Pull",
    "primary_muscles": [
      "deltoide_posterior"
    ],
    "secondary_muscles": [
      "romboides",
      "trapezio"
    ],
    "equipment": [
      "cable"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Face Pull",
      "Face Pull"
    ],
    "category": "Costas",
    "muscle_primary": "Deltoide Posterior",
    "muscle_secondary": [
      "Romboides",
      "Trapézio"
    ],
    "training_style": [
      "Hipertrofia",
      "Mobilidade"
    ],
    "type": "Isolamento"
  },
  {
    "id": "back-extension",
    "name": "Hiperextensão",
    "name_en": "Back Extension",
    "primary_muscles": [
      "eretores_da_espinha"
    ],
    "secondary_muscles": [
      "gluteos",
      "isquiotibiais"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Hiperextensão",
      "Back Extension"
    ],
    "category": "Costas",
    "muscle_primary": "Eretores da Espinha",
    "muscle_secondary": [
      "Glúteos",
      "Isquiotibiais"
    ],
    "training_style": [
      "Força",
      "Reabilitação"
    ],
    "type": "Isolamento"
  },
  {
    "id": "t-bar-row",
    "name": "Remada T-Bar",
    "name_en": "T-Bar Row",
    "primary_muscles": [
      "latissimo_do_dorso"
    ],
    "secondary_muscles": [
      "romboides",
      "trapezio"
    ],
    "equipment": [
      "barbell",
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Remada T-Bar",
      "T-Bar Row"
    ],
    "category": "Costas",
    "muscle_primary": "Latíssimo do Dorso",
    "muscle_secondary": [
      "Romboides",
      "Trapézio"
    ],
    "training_style": [
      "Força",
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "dumbbell-pullover",
    "name": "Pullover com Halter",
    "name_en": "Dumbbell Pullover",
    "primary_muscles": [
      "latissimo_do_dorso"
    ],
    "secondary_muscles": [
      "peitoral",
      "triceps"
    ],
    "equipment": [
      "dumbbell",
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Pullover com Halter",
      "Dumbbell Pullover"
    ],
    "category": "Costas",
    "muscle_primary": "Latíssimo do Dorso",
    "muscle_secondary": [
      "Peitoral",
      "Tríceps"
    ],
    "training_style": [
      "Hipertrofia"
    ],
    "type": "Isolamento"
  },
  {
    "id": "overhead-barbell-press",
    "name": "Desenvolvimento com Barra",
    "name_en": "Overhead Barbell Press",
    "primary_muscles": [
      "deltoide"
    ],
    "secondary_muscles": [
      "triceps",
      "trapezio"
    ],
    "equipment": [
      "barbell"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Desenvolvimento com Barra",
      "Overhead Barbell Press"
    ],
    "category": "Ombros",
    "muscle_primary": "Deltoide",
    "muscle_secondary": [
      "Tríceps",
      "Trapézio"
    ],
    "training_style": [
      "Força",
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "dumbbell-shoulder-press",
    "name": "Desenvolvimento com Halteres",
    "name_en": "Dumbbell Shoulder Press",
    "primary_muscles": [
      "deltoide"
    ],
    "secondary_muscles": [
      "triceps"
    ],
    "equipment": [
      "dumbbell"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Desenvolvimento com Halteres",
      "Dumbbell Shoulder Press"
    ],
    "category": "Ombros",
    "muscle_primary": "Deltoide",
    "muscle_secondary": [
      "Tríceps"
    ],
    "training_style": [
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "arnold-press",
    "name": "Arnold Press",
    "name_en": "Arnold Press",
    "primary_muscles": [
      "deltoide_3_porcoes"
    ],
    "secondary_muscles": [
      "triceps"
    ],
    "equipment": [
      "dumbbell"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Arnold Press",
      "Arnold Press"
    ],
    "category": "Ombros",
    "muscle_primary": "Deltoide (3 porções)",
    "muscle_secondary": [
      "Tríceps"
    ],
    "training_style": [
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "lateral-raise",
    "name": "Elevação Lateral",
    "name_en": "Lateral Raise",
    "primary_muscles": [
      "deltoide_lateral"
    ],
    "secondary_muscles": [],
    "equipment": [
      "dumbbell"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Elevação Lateral",
      "Lateral Raise"
    ],
    "category": "Ombros",
    "muscle_primary": "Deltoide Lateral",
    "muscle_secondary": [],
    "training_style": [
      "Hipertrofia",
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "front-raise",
    "name": "Elevação Frontal",
    "name_en": "Front Raise",
    "primary_muscles": [
      "deltoide_anterior"
    ],
    "secondary_muscles": [],
    "equipment": [
      "dumbbell",
      "barbell"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Elevação Frontal",
      "Front Raise"
    ],
    "category": "Ombros",
    "muscle_primary": "Deltoide Anterior",
    "muscle_secondary": [],
    "training_style": [
      "Hipertrofia",
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "reverse-fly",
    "name": "Crucifixo Inverso",
    "name_en": "Reverse Fly",
    "primary_muscles": [
      "deltoide_posterior"
    ],
    "secondary_muscles": [
      "romboides"
    ],
    "equipment": [
      "dumbbell",
      "cable"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Crucifixo Inverso",
      "Reverse Fly"
    ],
    "category": "Ombros",
    "muscle_primary": "Deltoide Posterior",
    "muscle_secondary": [
      "Romboides"
    ],
    "training_style": [
      "Hipertrofia",
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "upright-row",
    "name": "Remada Alta",
    "name_en": "Upright Row",
    "primary_muscles": [
      "trapezio"
    ],
    "secondary_muscles": [
      "deltoide"
    ],
    "equipment": [
      "barbell",
      "dumbbell"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Remada Alta",
      "Upright Row"
    ],
    "category": "Ombros",
    "muscle_primary": "Trapézio",
    "muscle_secondary": [
      "Deltoide"
    ],
    "training_style": [
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "pike-push-up",
    "name": "Flexão de Braço em Pike",
    "name_en": "Pike Push-up",
    "primary_muscles": [
      "deltoide"
    ],
    "secondary_muscles": [
      "triceps"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Flexão de Braço em Pike",
      "Pike Push-up"
    ],
    "category": "Ombros",
    "muscle_primary": "Deltoide",
    "muscle_secondary": [
      "Tríceps"
    ],
    "training_style": [
      "Calistenia"
    ],
    "type": "Composto"
  },
  {
    "id": "handstand-push-up",
    "name": "Handstand Push-up",
    "name_en": "Handstand Push-up",
    "primary_muscles": [
      "deltoide"
    ],
    "secondary_muscles": [
      "triceps",
      "core"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Handstand Push-up",
      "Handstand Push-up"
    ],
    "category": "Ombros",
    "muscle_primary": "Deltoide",
    "muscle_secondary": [
      "Tríceps",
      "Core"
    ],
    "training_style": [
      "Calistenia"
    ],
    "type": "Composto"
  },
  {
    "id": "barbell-curl",
    "name": "Rosca Direta com Barra",
    "name_en": "Barbell Curl",
    "primary_muscles": [
      "biceps_braquial"
    ],
    "secondary_muscles": [
      "braquial",
      "braquiorradial"
    ],
    "equipment": [
      "barbell"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Rosca Direta com Barra",
      "Barbell Curl"
    ],
    "category": "Bíceps",
    "muscle_primary": "Bíceps Braquial",
    "muscle_secondary": [
      "Braquial",
      "Braquiorradial"
    ],
    "training_style": [
      "Hipertrofia",
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "dumbbell-curl",
    "name": "Rosca com Halteres",
    "name_en": "Dumbbell Curl",
    "primary_muscles": [
      "biceps_braquial"
    ],
    "secondary_muscles": [
      "braquial"
    ],
    "equipment": [
      "dumbbell"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Rosca com Halteres",
      "Dumbbell Curl"
    ],
    "category": "Bíceps",
    "muscle_primary": "Bíceps Braquial",
    "muscle_secondary": [
      "Braquial"
    ],
    "training_style": [
      "Hipertrofia",
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "hammer-curl",
    "name": "Rosca Martelo",
    "name_en": "Hammer Curl",
    "primary_muscles": [
      "braquiorradial"
    ],
    "secondary_muscles": [
      "biceps_braquial"
    ],
    "equipment": [
      "dumbbell"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Rosca Martelo",
      "Hammer Curl"
    ],
    "category": "Bíceps",
    "muscle_primary": "Braquiorradial",
    "muscle_secondary": [
      "Bíceps Braquial"
    ],
    "training_style": [
      "Hipertrofia",
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "concentration-curl",
    "name": "Rosca Concentrada",
    "name_en": "Concentration Curl",
    "primary_muscles": [
      "biceps_braquial"
    ],
    "secondary_muscles": [],
    "equipment": [
      "dumbbell"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Rosca Concentrada",
      "Concentration Curl"
    ],
    "category": "Bíceps",
    "muscle_primary": "Bíceps Braquial",
    "muscle_secondary": [],
    "training_style": [
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "preacher-curl",
    "name": "Rosca Scott",
    "name_en": "Preacher Curl",
    "primary_muscles": [
      "biceps_braquial_cabeca_longa"
    ],
    "secondary_muscles": [],
    "equipment": [
      "barbell",
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Rosca Scott",
      "Preacher Curl"
    ],
    "category": "Bíceps",
    "muscle_primary": "Bíceps Braquial (cabeça longa)",
    "muscle_secondary": [],
    "training_style": [
      "Hipertrofia",
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "cable-curl",
    "name": "Rosca no Cabo",
    "name_en": "Cable Curl",
    "primary_muscles": [
      "biceps_braquial"
    ],
    "secondary_muscles": [],
    "equipment": [
      "cable"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Rosca no Cabo",
      "Cable Curl"
    ],
    "category": "Bíceps",
    "muscle_primary": "Bíceps Braquial",
    "muscle_secondary": [],
    "training_style": [
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "incline-dumbbell-curl",
    "name": "Rosca Inclinada",
    "name_en": "Incline Dumbbell Curl",
    "primary_muscles": [
      "biceps_braquial_cabeca_longa"
    ],
    "secondary_muscles": [],
    "equipment": [
      "dumbbell",
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Rosca Inclinada",
      "Incline Dumbbell Curl"
    ],
    "category": "Bíceps",
    "muscle_primary": "Bíceps Braquial (cabeça longa)",
    "muscle_secondary": [],
    "training_style": [
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "skull-crusher",
    "name": "Tríceps Testa",
    "name_en": "Skull Crusher",
    "primary_muscles": [
      "triceps_braquial"
    ],
    "secondary_muscles": [],
    "equipment": [
      "barbell",
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Tríceps Testa",
      "Skull Crusher"
    ],
    "category": "Tríceps",
    "muscle_primary": "Tríceps Braquial",
    "muscle_secondary": [],
    "training_style": [
      "Hipertrofia",
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "overhead-triceps-extension",
    "name": "Extensão de Tríceps Acima da Cabeça",
    "name_en": "Overhead Triceps Extension",
    "primary_muscles": [
      "triceps_cabeca_longa"
    ],
    "secondary_muscles": [],
    "equipment": [
      "dumbbell",
      "cable"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Extensão de Tríceps Acima da Cabeça",
      "Overhead Triceps Extension"
    ],
    "category": "Tríceps",
    "muscle_primary": "Tríceps (cabeça longa)",
    "muscle_secondary": [],
    "training_style": [
      "Hipertrofia",
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "triceps-pushdown",
    "name": "Pulldown de Tríceps",
    "name_en": "Triceps Pushdown",
    "primary_muscles": [
      "triceps_braquial"
    ],
    "secondary_muscles": [],
    "equipment": [
      "cable"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Pulldown de Tríceps",
      "Triceps Pushdown"
    ],
    "category": "Tríceps",
    "muscle_primary": "Tríceps Braquial",
    "muscle_secondary": [],
    "training_style": [
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "triceps-kickback",
    "name": "Tríceps Coice",
    "name_en": "Triceps Kickback",
    "primary_muscles": [
      "triceps_braquial"
    ],
    "secondary_muscles": [],
    "equipment": [
      "dumbbell"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Tríceps Coice",
      "Triceps Kickback"
    ],
    "category": "Tríceps",
    "muscle_primary": "Tríceps Braquial",
    "muscle_secondary": [],
    "training_style": [
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "close-grip-bench-press",
    "name": "Supino Fechado",
    "name_en": "Close-Grip Bench Press",
    "primary_muscles": [
      "triceps_braquial"
    ],
    "secondary_muscles": [
      "peitoral",
      "deltoide"
    ],
    "equipment": [
      "barbell",
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Supino Fechado",
      "Close-Grip Bench Press"
    ],
    "category": "Tríceps",
    "muscle_primary": "Tríceps Braquial",
    "muscle_secondary": [
      "Peitoral",
      "Deltoide"
    ],
    "training_style": [
      "Força",
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "triceps-dip",
    "name": "Dips para Tríceps",
    "name_en": "Triceps Dip",
    "primary_muscles": [
      "triceps_braquial"
    ],
    "secondary_muscles": [
      "peitoral",
      "deltoide"
    ],
    "equipment": [
      "none",
      "bodyweight"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Dips para Tríceps",
      "Triceps Dip"
    ],
    "category": "Tríceps",
    "muscle_primary": "Tríceps Braquial",
    "muscle_secondary": [
      "Peitoral",
      "Deltoide"
    ],
    "training_style": [
      "Calistenia",
      "Força"
    ],
    "type": "Composto"
  },
  {
    "id": "back-squat",
    "name": "Agachamento com Barra",
    "name_en": "Back Squat",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "gluteos",
      "isquiotibiais"
    ],
    "equipment": [
      "barbell"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Agachamento com Barra",
      "Back Squat"
    ],
    "category": "Quadríceps",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Glúteos",
      "Isquiotibiais"
    ],
    "training_style": [
      "Força",
      "Powerlifting",
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "front-squat",
    "name": "Agachamento Frontal",
    "name_en": "Front Squat",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "core",
      "gluteos"
    ],
    "equipment": [
      "barbell"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Agachamento Frontal",
      "Front Squat"
    ],
    "category": "Quadríceps",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Core",
      "Glúteos"
    ],
    "training_style": [
      "Força",
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "leg-press",
    "name": "Leg Press",
    "name_en": "Leg Press",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "gluteos",
      "isquiotibiais"
    ],
    "equipment": [
      "machine"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Leg Press",
      "Leg Press"
    ],
    "category": "Quadríceps",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Glúteos",
      "Isquiotibiais"
    ],
    "training_style": [
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "leg-extension",
    "name": "Extensão de Perna",
    "name_en": "Leg Extension",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [],
    "equipment": [
      "machine"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Extensão de Perna",
      "Leg Extension"
    ],
    "category": "Quadríceps",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [],
    "training_style": [
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "lunge",
    "name": "Avanço",
    "name_en": "Lunge",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "gluteos",
      "isquiotibiais"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Avanço",
      "Lunge"
    ],
    "category": "Quadríceps",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Glúteos",
      "Isquiotibiais"
    ],
    "training_style": [
      "Calistenia",
      "Hipertrofia",
      "Funcional"
    ],
    "type": "Composto"
  },
  {
    "id": "bulgarian-split-squat",
    "name": "Agachamento Búlgaro",
    "name_en": "Bulgarian Split Squat",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "gluteos"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Agachamento Búlgaro",
      "Bulgarian Split Squat"
    ],
    "category": "Quadríceps",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Glúteos"
    ],
    "training_style": [
      "Hipertrofia",
      "Funcional"
    ],
    "type": "Composto"
  },
  {
    "id": "hack-squat",
    "name": "Hack Squat",
    "name_en": "Hack Squat",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "gluteos"
    ],
    "equipment": [
      "machine",
      "barbell"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Hack Squat",
      "Hack Squat"
    ],
    "category": "Quadríceps",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Glúteos"
    ],
    "training_style": [
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "sumo-squat",
    "name": "Agachamento Sumo",
    "name_en": "Sumo Squat",
    "primary_muscles": [
      "adutores"
    ],
    "secondary_muscles": [
      "quadriceps",
      "gluteos"
    ],
    "equipment": [
      "dumbbell",
      "barbell"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Agachamento Sumo",
      "Sumo Squat"
    ],
    "category": "Quadríceps",
    "muscle_primary": "Adutores",
    "muscle_secondary": [
      "Quadríceps",
      "Glúteos"
    ],
    "training_style": [
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "bodyweight-squat",
    "name": "Agachamento Livre (sem peso)",
    "name_en": "Bodyweight Squat",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "gluteos"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Agachamento Livre (sem peso)",
      "Bodyweight Squat"
    ],
    "category": "Quadríceps",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Glúteos"
    ],
    "training_style": [
      "Calistenia",
      "Funcional",
      "HIIT"
    ],
    "type": "Composto"
  },
  {
    "id": "pistol-squat",
    "name": "Agachamento no Pistol",
    "name_en": "Pistol Squat",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "gluteos",
      "core"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Agachamento no Pistol",
      "Pistol Squat"
    ],
    "category": "Quadríceps",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Glúteos",
      "Core"
    ],
    "training_style": [
      "Calistenia"
    ],
    "type": "Composto"
  },
  {
    "id": "leg-extension-machine",
    "name": "Cadeira Extensora",
    "name_en": "Leg Extension Machine",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [],
    "equipment": [
      "machine"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Cadeira Extensora",
      "Leg Extension Machine"
    ],
    "category": "Quadríceps",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [],
    "training_style": [
      "Isolamento",
      "Reabilitação"
    ],
    "type": "Isolamento"
  },
  {
    "id": "wall-sit",
    "name": "Wall Sit",
    "name_en": "Wall Sit",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "gluteos"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Wall Sit",
      "Wall Sit"
    ],
    "category": "Quadríceps",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Glúteos"
    ],
    "training_style": [
      "Calistenia",
      "Resistência"
    ],
    "type": "Isométrico"
  },
  {
    "id": "romanian-deadlift",
    "name": "Levantamento Terra Romeno",
    "name_en": "Romanian Deadlift",
    "primary_muscles": [
      "isquiotibiais"
    ],
    "secondary_muscles": [
      "gluteos",
      "eretores"
    ],
    "equipment": [
      "barbell",
      "dumbbell"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Levantamento Terra Romeno",
      "Romanian Deadlift"
    ],
    "category": "Isquiotibiais",
    "muscle_primary": "Isquiotibiais",
    "muscle_secondary": [
      "Glúteos",
      "Eretores"
    ],
    "training_style": [
      "Força",
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "leg-curl-machine",
    "name": "Flexão de Joelho (Mesa Flexora)",
    "name_en": "Leg Curl Machine",
    "primary_muscles": [
      "isquiotibiais"
    ],
    "secondary_muscles": [],
    "equipment": [
      "machine"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Flexão de Joelho (Mesa Flexora)",
      "Leg Curl Machine"
    ],
    "category": "Isquiotibiais",
    "muscle_primary": "Isquiotibiais",
    "muscle_secondary": [],
    "training_style": [
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "nordic-hamstring-curl",
    "name": "Nordic Hamstring Curl",
    "name_en": "Nordic Hamstring Curl",
    "primary_muscles": [
      "isquiotibiais"
    ],
    "secondary_muscles": [
      "gluteos"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Nordic Hamstring Curl",
      "Nordic Hamstring Curl"
    ],
    "category": "Isquiotibiais",
    "muscle_primary": "Isquiotibiais",
    "muscle_secondary": [
      "Glúteos"
    ],
    "training_style": [
      "Força",
      "Reabilitação"
    ],
    "type": "Isolamento"
  },
  {
    "id": "good-morning",
    "name": "Good Morning",
    "name_en": "Good Morning",
    "primary_muscles": [
      "isquiotibiais"
    ],
    "secondary_muscles": [
      "eretores",
      "gluteos"
    ],
    "equipment": [
      "barbell"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Good Morning",
      "Good Morning"
    ],
    "category": "Isquiotibiais",
    "muscle_primary": "Isquiotibiais",
    "muscle_secondary": [
      "Eretores",
      "Glúteos"
    ],
    "training_style": [
      "Força"
    ],
    "type": "Composto"
  },
  {
    "id": "stiff-leg-deadlift",
    "name": "Levantamento Terra Stiff",
    "name_en": "Stiff-Leg Deadlift",
    "primary_muscles": [
      "isquiotibiais"
    ],
    "secondary_muscles": [
      "gluteos",
      "eretores"
    ],
    "equipment": [
      "barbell",
      "dumbbell"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Levantamento Terra Stiff",
      "Stiff-Leg Deadlift"
    ],
    "category": "Isquiotibiais",
    "muscle_primary": "Isquiotibiais",
    "muscle_secondary": [
      "Glúteos",
      "Eretores"
    ],
    "training_style": [
      "Força",
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "swiss-ball-leg-curl",
    "name": "Swiss Ball Leg Curl",
    "name_en": "Swiss Ball Leg Curl",
    "primary_muscles": [
      "isquiotibiais"
    ],
    "secondary_muscles": [
      "gluteos",
      "core"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Swiss Ball Leg Curl",
      "Swiss Ball Leg Curl"
    ],
    "category": "Isquiotibiais",
    "muscle_primary": "Isquiotibiais",
    "muscle_secondary": [
      "Glúteos",
      "Core"
    ],
    "training_style": [
      "Funcional",
      "Reabilitação"
    ],
    "type": "Composto"
  },
  {
    "id": "hip-thrust",
    "name": "Hip Thrust",
    "name_en": "Hip Thrust",
    "primary_muscles": [
      "gluteo_maximo"
    ],
    "secondary_muscles": [
      "isquiotibiais",
      "core"
    ],
    "equipment": [
      "barbell",
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Hip Thrust",
      "Hip Thrust"
    ],
    "category": "Glúteos",
    "muscle_primary": "Glúteo Máximo",
    "muscle_secondary": [
      "Isquiotibiais",
      "Core"
    ],
    "training_style": [
      "Hipertrofia",
      "Força"
    ],
    "type": "Composto"
  },
  {
    "id": "glute-bridge",
    "name": "Ponte de Glúteo",
    "name_en": "Glute Bridge",
    "primary_muscles": [
      "gluteo_maximo"
    ],
    "secondary_muscles": [
      "isquiotibiais"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Ponte de Glúteo",
      "Glute Bridge"
    ],
    "category": "Glúteos",
    "muscle_primary": "Glúteo Máximo",
    "muscle_secondary": [
      "Isquiotibiais"
    ],
    "training_style": [
      "Calistenia",
      "Reabilitação"
    ],
    "type": "Isolamento"
  },
  {
    "id": "cable-kickback",
    "name": "Kickback no Cabo",
    "name_en": "Cable Kickback",
    "primary_muscles": [
      "gluteo_maximo"
    ],
    "secondary_muscles": [],
    "equipment": [
      "cable"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Kickback no Cabo",
      "Cable Kickback"
    ],
    "category": "Glúteos",
    "muscle_primary": "Glúteo Máximo",
    "muscle_secondary": [],
    "training_style": [
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "donkey-kick",
    "name": "Donkey Kick",
    "name_en": "Donkey Kick",
    "primary_muscles": [
      "gluteo_maximo"
    ],
    "secondary_muscles": [],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Donkey Kick",
      "Donkey Kick"
    ],
    "category": "Glúteos",
    "muscle_primary": "Glúteo Máximo",
    "muscle_secondary": [],
    "training_style": [
      "Calistenia",
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "lateral-band-walk",
    "name": "Abdução com Faixa Elástica",
    "name_en": "Lateral Band Walk",
    "primary_muscles": [
      "gluteo_medio"
    ],
    "secondary_muscles": [
      "gluteo_minimo"
    ],
    "equipment": [
      "band"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Abdução com Faixa Elástica",
      "Lateral Band Walk"
    ],
    "category": "Glúteos",
    "muscle_primary": "Glúteo Médio",
    "muscle_secondary": [
      "Glúteo Mínimo"
    ],
    "training_style": [
      "Funcional",
      "Reabilitação"
    ],
    "type": "Isolamento"
  },
  {
    "id": "reverse-lunge",
    "name": "Avanço Reverso",
    "name_en": "Reverse Lunge",
    "primary_muscles": [
      "gluteo_maximo"
    ],
    "secondary_muscles": [
      "quadriceps"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Avanço Reverso",
      "Reverse Lunge"
    ],
    "category": "Glúteos",
    "muscle_primary": "Glúteo Máximo",
    "muscle_secondary": [
      "Quadríceps"
    ],
    "training_style": [
      "Calistenia",
      "Funcional"
    ],
    "type": "Composto"
  },
  {
    "id": "step-up",
    "name": "Step-Up",
    "name_en": "Step-Up",
    "primary_muscles": [
      "gluteo_maximo"
    ],
    "secondary_muscles": [
      "quadriceps",
      "isquiotibiais"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Step-Up",
      "Step-Up"
    ],
    "category": "Glúteos",
    "muscle_primary": "Glúteo Máximo",
    "muscle_secondary": [
      "Quadríceps",
      "Isquiotibiais"
    ],
    "training_style": [
      "Funcional",
      "Hipertrofia"
    ],
    "type": "Composto"
  },
  {
    "id": "hip-abduction-machine",
    "name": "Abdução na Máquina",
    "name_en": "Hip Abduction Machine",
    "primary_muscles": [
      "gluteo_medio"
    ],
    "secondary_muscles": [],
    "equipment": [
      "machine"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Abdução na Máquina",
      "Hip Abduction Machine"
    ],
    "category": "Glúteos",
    "muscle_primary": "Glúteo Médio",
    "muscle_secondary": [],
    "training_style": [
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "standing-calf-raise",
    "name": "Elevação de Panturrilha em Pé",
    "name_en": "Standing Calf Raise",
    "primary_muscles": [
      "gastrocnemio"
    ],
    "secondary_muscles": [
      "soleo"
    ],
    "equipment": [
      "machine",
      "barbell",
      "dumbbell"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Elevação de Panturrilha em Pé",
      "Standing Calf Raise"
    ],
    "category": "Panturrilha",
    "muscle_primary": "Gastrocnêmio",
    "muscle_secondary": [
      "Sóleo"
    ],
    "training_style": [
      "Isolamento",
      "Hipertrofia"
    ],
    "type": "Isolamento"
  },
  {
    "id": "seated-calf-raise",
    "name": "Elevação de Panturrilha Sentado",
    "name_en": "Seated Calf Raise",
    "primary_muscles": [
      "soleo"
    ],
    "secondary_muscles": [
      "gastrocnemio"
    ],
    "equipment": [
      "machine"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Elevação de Panturrilha Sentado",
      "Seated Calf Raise"
    ],
    "category": "Panturrilha",
    "muscle_primary": "Sóleo",
    "muscle_secondary": [
      "Gastrocnêmio"
    ],
    "training_style": [
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "wall-calf-raise",
    "name": "Elevação de Panturrilha (Parede)",
    "name_en": "Wall Calf Raise",
    "primary_muscles": [
      "gastrocnemio"
    ],
    "secondary_muscles": [],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Elevação de Panturrilha (Parede)",
      "Wall Calf Raise"
    ],
    "category": "Panturrilha",
    "muscle_primary": "Gastrocnêmio",
    "muscle_secondary": [],
    "training_style": [
      "Calistenia"
    ],
    "type": "Isolamento"
  },
  {
    "id": "jump-rope",
    "name": "Pulo de Corda",
    "name_en": "Jump Rope",
    "primary_muscles": [
      "gastrocnemio"
    ],
    "secondary_muscles": [
      "cardio"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Pulo de Corda",
      "Jump Rope"
    ],
    "category": "Panturrilha",
    "muscle_primary": "Gastrocnêmio",
    "muscle_secondary": [
      "Cardio"
    ],
    "training_style": [
      "Cardio",
      "HIIT"
    ],
    "type": "Cardio"
  },
  {
    "id": "box-jump",
    "name": "Box Jump",
    "name_en": "Box Jump",
    "primary_muscles": [
      "gastrocnemio"
    ],
    "secondary_muscles": [
      "quadriceps",
      "gluteos"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Box Jump",
      "Box Jump"
    ],
    "category": "Panturrilha",
    "muscle_primary": "Gastrocnêmio",
    "muscle_secondary": [
      "Quadríceps",
      "Glúteos"
    ],
    "training_style": [
      "Explosão",
      "HIIT",
      "Pliométrico"
    ],
    "type": "Pliométrico"
  },
  {
    "id": "plank",
    "name": "Prancha",
    "name_en": "Plank",
    "primary_muscles": [
      "core_transverso"
    ],
    "secondary_muscles": [
      "deltoide",
      "gluteos"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Prancha",
      "Plank"
    ],
    "category": "Core",
    "muscle_primary": "Core (Transverso)",
    "muscle_secondary": [
      "Deltoide",
      "Glúteos"
    ],
    "training_style": [
      "Calistenia",
      "Funcional"
    ],
    "type": "Isométrico"
  },
  {
    "id": "side-plank",
    "name": "Prancha Lateral",
    "name_en": "Side Plank",
    "primary_muscles": [
      "obliquos"
    ],
    "secondary_muscles": [
      "core",
      "quadratus_lumborum"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Prancha Lateral",
      "Side Plank"
    ],
    "category": "Core",
    "muscle_primary": "Oblíquos",
    "muscle_secondary": [
      "Core",
      "Quadratus Lumborum"
    ],
    "training_style": [
      "Calistenia",
      "Funcional"
    ],
    "type": "Isométrico"
  },
  {
    "id": "crunch",
    "name": "Abdominal Crunch",
    "name_en": "Crunch",
    "primary_muscles": [
      "reto_abdominal"
    ],
    "secondary_muscles": [],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Abdominal Crunch",
      "Crunch"
    ],
    "category": "Core",
    "muscle_primary": "Reto Abdominal",
    "muscle_secondary": [],
    "training_style": [
      "Calistenia",
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "leg-raise",
    "name": "Elevação de Pernas",
    "name_en": "Leg Raise",
    "primary_muscles": [
      "reto_abdominal_inferior"
    ],
    "secondary_muscles": [
      "flexores_do_quadril"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Elevação de Pernas",
      "Leg Raise"
    ],
    "category": "Core",
    "muscle_primary": "Reto Abdominal Inferior",
    "muscle_secondary": [
      "Flexores do Quadril"
    ],
    "training_style": [
      "Calistenia"
    ],
    "type": "Isolamento"
  },
  {
    "id": "hanging-knee-raise",
    "name": "Elevação de Joelhos na Barra",
    "name_en": "Hanging Knee Raise",
    "primary_muscles": [
      "reto_abdominal"
    ],
    "secondary_muscles": [
      "flexores_do_quadril"
    ],
    "equipment": [
      "bodyweight"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Elevação de Joelhos na Barra",
      "Hanging Knee Raise"
    ],
    "category": "Core",
    "muscle_primary": "Reto Abdominal",
    "muscle_secondary": [
      "Flexores do Quadril"
    ],
    "training_style": [
      "Calistenia",
      "Hipertrofia"
    ],
    "type": "Isolamento"
  },
  {
    "id": "russian-twist",
    "name": "Russian Twist",
    "name_en": "Russian Twist",
    "primary_muscles": [
      "obliquos"
    ],
    "secondary_muscles": [
      "reto_abdominal"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Russian Twist",
      "Russian Twist"
    ],
    "category": "Core",
    "muscle_primary": "Oblíquos",
    "muscle_secondary": [
      "Reto Abdominal"
    ],
    "training_style": [
      "Funcional",
      "Calistenia"
    ],
    "type": "Isolamento"
  },
  {
    "id": "ab-wheel-rollout",
    "name": "Roda Abdominal",
    "name_en": "Ab Wheel Rollout",
    "primary_muscles": [
      "reto_abdominal"
    ],
    "secondary_muscles": [
      "core",
      "dorsais"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Roda Abdominal",
      "Ab Wheel Rollout"
    ],
    "category": "Core",
    "muscle_primary": "Reto Abdominal",
    "muscle_secondary": [
      "Core",
      "Dorsais"
    ],
    "training_style": [
      "Calistenia"
    ],
    "type": "Composto"
  },
  {
    "id": "mountain-climber",
    "name": "Mountain Climber",
    "name_en": "Mountain Climber",
    "primary_muscles": [
      "core"
    ],
    "secondary_muscles": [
      "ombros",
      "flexores_do_quadril"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Mountain Climber",
      "Mountain Climber"
    ],
    "category": "Core",
    "muscle_primary": "Core",
    "muscle_secondary": [
      "Ombros",
      "Flexores do Quadril"
    ],
    "training_style": [
      "HIIT",
      "Funcional",
      "Cardio"
    ],
    "type": "Cardio"
  },
  {
    "id": "dead-bug",
    "name": "Dead Bug",
    "name_en": "Dead Bug",
    "primary_muscles": [
      "core_transverso"
    ],
    "secondary_muscles": [
      "reto_abdominal"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Dead Bug",
      "Dead Bug"
    ],
    "category": "Core",
    "muscle_primary": "Core (Transverso)",
    "muscle_secondary": [
      "Reto Abdominal"
    ],
    "training_style": [
      "Funcional",
      "Reabilitação"
    ],
    "type": "Isolamento"
  },
  {
    "id": "hollow-body-hold",
    "name": "Hollow Body Hold",
    "name_en": "Hollow Body Hold",
    "primary_muscles": [
      "reto_abdominal"
    ],
    "secondary_muscles": [
      "core"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Hollow Body Hold",
      "Hollow Body Hold"
    ],
    "category": "Core",
    "muscle_primary": "Reto Abdominal",
    "muscle_secondary": [
      "Core"
    ],
    "training_style": [
      "Calistenia",
      "Ginástica"
    ],
    "type": "Isométrico"
  },
  {
    "id": "l-sit",
    "name": "L-Sit",
    "name_en": "L-Sit",
    "primary_muscles": [
      "core"
    ],
    "secondary_muscles": [
      "triceps",
      "flexores_do_quadril"
    ],
    "equipment": [
      "bodyweight"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "L-Sit",
      "L-Sit"
    ],
    "category": "Core",
    "muscle_primary": "Core",
    "muscle_secondary": [
      "Tríceps",
      "Flexores do Quadril"
    ],
    "training_style": [
      "Calistenia",
      "Ginástica"
    ],
    "type": "Isométrico"
  },
  {
    "id": "dragon-flag",
    "name": "Dragon Flag",
    "name_en": "Dragon Flag",
    "primary_muscles": [
      "reto_abdominal"
    ],
    "secondary_muscles": [
      "core",
      "dorsais"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Dragon Flag",
      "Dragon Flag"
    ],
    "category": "Core",
    "muscle_primary": "Reto Abdominal",
    "muscle_secondary": [
      "Core",
      "Dorsais"
    ],
    "training_style": [
      "Calistenia"
    ],
    "type": "Isolamento"
  },
  {
    "id": "cable-woodchop",
    "name": "Oblíquo no Cabo",
    "name_en": "Cable Woodchop",
    "primary_muscles": [
      "obliquos"
    ],
    "secondary_muscles": [
      "core",
      "ombros"
    ],
    "equipment": [
      "cable"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Oblíquo no Cabo",
      "Cable Woodchop"
    ],
    "category": "Core",
    "muscle_primary": "Oblíquos",
    "muscle_secondary": [
      "Core",
      "Ombros"
    ],
    "training_style": [
      "Funcional"
    ],
    "type": "Funcional"
  },
  {
    "id": "stomach-vacuum",
    "name": "Vacuum Abdominal",
    "name_en": "Stomach Vacuum",
    "primary_muscles": [
      "transverso_abdominal"
    ],
    "secondary_muscles": [],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Vacuum Abdominal",
      "Stomach Vacuum"
    ],
    "category": "Core",
    "muscle_primary": "Transverso Abdominal",
    "muscle_secondary": [],
    "training_style": [
      "Funcional",
      "Reabilitação"
    ],
    "type": "Isométrico"
  },
  {
    "id": "burpee",
    "name": "Burpee",
    "name_en": "Burpee",
    "primary_muscles": [
      "corpo_inteiro"
    ],
    "secondary_muscles": [
      "cardio"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Burpee",
      "Burpee"
    ],
    "category": "Cardio",
    "muscle_primary": "Corpo Inteiro",
    "muscle_secondary": [
      "Cardio"
    ],
    "training_style": [
      "HIIT",
      "Funcional",
      "Cardio"
    ],
    "type": "Cardio"
  },
  {
    "id": "jumping-jack",
    "name": "Jumping Jack",
    "name_en": "Jumping Jack",
    "primary_muscles": [
      "corpo_inteiro"
    ],
    "secondary_muscles": [
      "ombros",
      "panturrilha"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Jumping Jack",
      "Jumping Jack"
    ],
    "category": "Cardio",
    "muscle_primary": "Corpo Inteiro",
    "muscle_secondary": [
      "Ombros",
      "Panturrilha"
    ],
    "training_style": [
      "Cardio",
      "HIIT",
      "Aquecimento"
    ],
    "type": "Cardio"
  },
  {
    "id": "high-knees",
    "name": "High Knees",
    "name_en": "High Knees",
    "primary_muscles": [
      "flexores_do_quadril"
    ],
    "secondary_muscles": [
      "quadriceps",
      "cardio"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "High Knees",
      "High Knees"
    ],
    "category": "Cardio",
    "muscle_primary": "Flexores do Quadril",
    "muscle_secondary": [
      "Quadríceps",
      "Cardio"
    ],
    "training_style": [
      "HIIT",
      "Cardio"
    ],
    "type": "Cardio"
  },
  {
    "id": "running",
    "name": "Corrida",
    "name_en": "Running",
    "primary_muscles": [
      "corpo_inteiro"
    ],
    "secondary_muscles": [
      "isquiotibiais",
      "gluteos"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Corrida",
      "Running"
    ],
    "category": "Cardio",
    "muscle_primary": "Corpo Inteiro",
    "muscle_secondary": [
      "Isquiotibiais",
      "Glúteos"
    ],
    "training_style": [
      "Cardio",
      "Resistência"
    ],
    "type": "Cardio"
  },
  {
    "id": "rowing-machine",
    "name": "Remo Ergométrico",
    "name_en": "Rowing Machine",
    "primary_muscles": [
      "costas"
    ],
    "secondary_muscles": [
      "biceps",
      "quadriceps",
      "core"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Remo Ergométrico",
      "Rowing Machine"
    ],
    "category": "Cardio",
    "muscle_primary": "Costas",
    "muscle_secondary": [
      "Bíceps",
      "Quadríceps",
      "Core"
    ],
    "training_style": [
      "Cardio",
      "Funcional"
    ],
    "type": "Cardio"
  },
  {
    "id": "stationary-bike",
    "name": "Bike Ergométrica",
    "name_en": "Stationary Bike",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "isquiotibiais",
      "panturrilha"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Bike Ergométrica",
      "Stationary Bike"
    ],
    "category": "Cardio",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Isquiotibiais",
      "Panturrilha"
    ],
    "training_style": [
      "Cardio",
      "Resistência"
    ],
    "type": "Cardio"
  },
  {
    "id": "battle-ropes",
    "name": "Battle Ropes",
    "name_en": "Battle Ropes",
    "primary_muscles": [
      "ombros"
    ],
    "secondary_muscles": [
      "core",
      "bracos",
      "cardio"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Battle Ropes",
      "Battle Ropes"
    ],
    "category": "Cardio",
    "muscle_primary": "Ombros",
    "muscle_secondary": [
      "Core",
      "Braços",
      "Cardio"
    ],
    "training_style": [
      "HIIT",
      "Funcional"
    ],
    "type": "Cardio"
  },
  {
    "id": "sprint",
    "name": "Sprint",
    "name_en": "Sprint",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "isquiotibiais",
      "gluteos",
      "panturrilha"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Sprint",
      "Sprint"
    ],
    "category": "Cardio",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Isquiotibiais",
      "Glúteos",
      "Panturrilha"
    ],
    "training_style": [
      "HIIT",
      "Pliométrico"
    ],
    "type": "Cardio"
  },
  {
    "id": "stair-climber",
    "name": "Escada Rolante / StairMaster",
    "name_en": "Stair Climber",
    "primary_muscles": [
      "gluteos"
    ],
    "secondary_muscles": [
      "quadriceps",
      "panturrilha"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Escada Rolante / StairMaster",
      "Stair Climber"
    ],
    "category": "Cardio",
    "muscle_primary": "Glúteos",
    "muscle_secondary": [
      "Quadríceps",
      "Panturrilha"
    ],
    "training_style": [
      "Cardio"
    ],
    "type": "Cardio"
  },
  {
    "id": "squat-jump",
    "name": "Polichinelo Agachado",
    "name_en": "Squat Jump",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "gluteos",
      "cardio"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Polichinelo Agachado",
      "Squat Jump"
    ],
    "category": "Cardio",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Glúteos",
      "Cardio"
    ],
    "training_style": [
      "HIIT",
      "Pliométrico"
    ],
    "type": "Pliométrico"
  },
  {
    "id": "conventional-deadlift",
    "name": "Levantamento Terra Convencional",
    "name_en": "Conventional Deadlift",
    "primary_muscles": [
      "eretores_da_espinha"
    ],
    "secondary_muscles": [
      "gluteos",
      "isquiotibiais",
      "trapezio",
      "quadriceps"
    ],
    "equipment": [
      "barbell"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Levantamento Terra Convencional",
      "Conventional Deadlift"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Eretores da Espinha",
    "muscle_secondary": [
      "Glúteos",
      "Isquiotibiais",
      "Trapézio",
      "Quadríceps"
    ],
    "training_style": [
      "Força",
      "Powerlifting"
    ],
    "type": "Composto"
  },
  {
    "id": "clean-and-press",
    "name": "Clean and Press",
    "name_en": "Clean and Press",
    "primary_muscles": [
      "corpo_inteiro"
    ],
    "secondary_muscles": [
      "ombros",
      "quadriceps",
      "core"
    ],
    "equipment": [
      "barbell",
      "dumbbell",
      "kettlebell"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Clean and Press",
      "Clean and Press"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Corpo Inteiro",
    "muscle_secondary": [
      "Ombros",
      "Quadríceps",
      "Core"
    ],
    "training_style": [
      "Força",
      "Funcional",
      "Levantamento Olímpico"
    ],
    "type": "Composto"
  },
  {
    "id": "turkish-get-up",
    "name": "Turkish Get-Up",
    "name_en": "Turkish Get-Up",
    "primary_muscles": [
      "core"
    ],
    "secondary_muscles": [
      "ombros",
      "gluteos",
      "quadriceps"
    ],
    "equipment": [
      "kettlebell",
      "dumbbell"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Turkish Get-Up",
      "Turkish Get-Up"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Core",
    "muscle_secondary": [
      "Ombros",
      "Glúteos",
      "Quadríceps"
    ],
    "training_style": [
      "Funcional",
      "Mobilidade"
    ],
    "type": "Funcional"
  },
  {
    "id": "thruster",
    "name": "Thruster",
    "name_en": "Thruster",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "ombros",
      "gluteos",
      "core"
    ],
    "equipment": [
      "barbell",
      "dumbbell",
      "kettlebell"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Thruster",
      "Thruster"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Ombros",
      "Glúteos",
      "Core"
    ],
    "training_style": [
      "CrossFit",
      "HIIT",
      "Funcional"
    ],
    "type": "Composto"
  },
  {
    "id": "farmer-s-walk",
    "name": "Farmer's Walk",
    "name_en": "Farmer's Walk",
    "primary_muscles": [
      "trapezio"
    ],
    "secondary_muscles": [
      "core",
      "antebraco",
      "quadriceps"
    ],
    "equipment": [
      "dumbbell",
      "kettlebell",
      "barbell"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Farmer's Walk",
      "Farmer's Walk"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Trapézio",
    "muscle_secondary": [
      "Core",
      "Antebraço",
      "Quadríceps"
    ],
    "training_style": [
      "Funcional",
      "Força"
    ],
    "type": "Funcional"
  },
  {
    "id": "bear-crawl",
    "name": "Bear Crawl",
    "name_en": "Bear Crawl",
    "primary_muscles": [
      "core"
    ],
    "secondary_muscles": [
      "ombros",
      "quadriceps"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Bear Crawl",
      "Bear Crawl"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Core",
    "muscle_secondary": [
      "Ombros",
      "Quadríceps"
    ],
    "training_style": [
      "Funcional",
      "Mobilidade"
    ],
    "type": "Funcional"
  },
  {
    "id": "kettlebell-swing",
    "name": "Swing com Kettlebell",
    "name_en": "Kettlebell Swing",
    "primary_muscles": [
      "gluteos"
    ],
    "secondary_muscles": [
      "isquiotibiais",
      "core",
      "ombros"
    ],
    "equipment": [
      "kettlebell"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Swing com Kettlebell",
      "Kettlebell Swing"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Glúteos",
    "muscle_secondary": [
      "Isquiotibiais",
      "Core",
      "Ombros"
    ],
    "training_style": [
      "Funcional",
      "HIIT",
      "Cardio"
    ],
    "type": "Funcional"
  },
  {
    "id": "kettlebell-snatch",
    "name": "Snatch com Kettlebell",
    "name_en": "Kettlebell Snatch",
    "primary_muscles": [
      "corpo_inteiro"
    ],
    "secondary_muscles": [
      "ombros",
      "core",
      "gluteos"
    ],
    "equipment": [
      "kettlebell"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Snatch com Kettlebell",
      "Kettlebell Snatch"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Corpo Inteiro",
    "muscle_secondary": [
      "Ombros",
      "Core",
      "Glúteos"
    ],
    "training_style": [
      "Funcional",
      "Levantamento Olímpico"
    ],
    "type": "Composto"
  },
  {
    "id": "man-maker",
    "name": "Man Maker",
    "name_en": "Man Maker",
    "primary_muscles": [
      "corpo_inteiro"
    ],
    "secondary_muscles": [
      "peito",
      "costas",
      "ombros",
      "core"
    ],
    "equipment": [
      "dumbbell"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Man Maker",
      "Man Maker"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Corpo Inteiro",
    "muscle_secondary": [
      "Peito",
      "Costas",
      "Ombros",
      "Core"
    ],
    "training_style": [
      "CrossFit",
      "HIIT"
    ],
    "type": "Composto"
  },
  {
    "id": "jump-squat",
    "name": "Agachamento com Salto",
    "name_en": "Jump Squat",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "gluteos",
      "panturrilha"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Agachamento com Salto",
      "Jump Squat"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Glúteos",
      "Panturrilha"
    ],
    "training_style": [
      "HIIT",
      "Pliométrico"
    ],
    "type": "Pliométrico"
  },
  {
    "id": "wrist-curl",
    "name": "Rosca de Punho",
    "name_en": "Wrist Curl",
    "primary_muscles": [
      "flexores_do_antebraco"
    ],
    "secondary_muscles": [],
    "equipment": [
      "barbell",
      "dumbbell"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Rosca de Punho",
      "Wrist Curl"
    ],
    "category": "Antebraço",
    "muscle_primary": "Flexores do Antebraço",
    "muscle_secondary": [],
    "training_style": [
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "wrist-extension",
    "name": "Extensão de Punho",
    "name_en": "Wrist Extension",
    "primary_muscles": [
      "extensores_do_antebraco"
    ],
    "secondary_muscles": [],
    "equipment": [
      "barbell",
      "dumbbell"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Extensão de Punho",
      "Wrist Extension"
    ],
    "category": "Antebraço",
    "muscle_primary": "Extensores do Antebraço",
    "muscle_secondary": [],
    "training_style": [
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "farmer-s-hold",
    "name": "Farmer's Hold",
    "name_en": "Farmer's Hold",
    "primary_muscles": [
      "antebraco"
    ],
    "secondary_muscles": [
      "trapezio"
    ],
    "equipment": [
      "dumbbell",
      "barbell"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Farmer's Hold",
      "Farmer's Hold"
    ],
    "category": "Antebraço",
    "muscle_primary": "Antebraço",
    "muscle_secondary": [
      "Trapézio"
    ],
    "training_style": [
      "Força",
      "Funcional"
    ],
    "type": "Isométrico"
  },
  {
    "id": "deep-squat-hold",
    "name": "Agachamento Profundo (mobilidade)",
    "name_en": "Deep Squat Hold",
    "primary_muscles": [
      "tornozelo"
    ],
    "secondary_muscles": [
      "quadril",
      "toracica"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Agachamento Profundo (mobilidade)",
      "Deep Squat Hold"
    ],
    "category": "Mobilidade",
    "muscle_primary": "Tornozelo",
    "muscle_secondary": [
      "Quadril",
      "Torácica"
    ],
    "training_style": [
      "Mobilidade",
      "Reabilitação"
    ],
    "type": "Mobilidade"
  },
  {
    "id": "hip-flexor-stretch",
    "name": "Hip Flexor Stretch",
    "name_en": "Hip Flexor Stretch",
    "primary_muscles": [
      "flexores_do_quadril"
    ],
    "secondary_muscles": [
      "gluteos"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Hip Flexor Stretch",
      "Hip Flexor Stretch"
    ],
    "category": "Mobilidade",
    "muscle_primary": "Flexores do Quadril",
    "muscle_secondary": [
      "Glúteos"
    ],
    "training_style": [
      "Flexibilidade",
      "Mobilidade"
    ],
    "type": "Mobilidade"
  },
  {
    "id": "world-s-greatest-stretch",
    "name": "World's Greatest Stretch",
    "name_en": "World's Greatest Stretch",
    "primary_muscles": [
      "corpo_inteiro"
    ],
    "secondary_muscles": [
      "quadril",
      "toracica",
      "isquiotibiais"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "World's Greatest Stretch",
      "World's Greatest Stretch"
    ],
    "category": "Mobilidade",
    "muscle_primary": "Corpo Inteiro",
    "muscle_secondary": [
      "Quadril",
      "Torácica",
      "Isquiotibiais"
    ],
    "training_style": [
      "Mobilidade",
      "Aquecimento"
    ],
    "type": "Mobilidade"
  },
  {
    "id": "thoracic-rotation",
    "name": "Rotação Torácica",
    "name_en": "Thoracic Rotation",
    "primary_muscles": [
      "coluna_toracica"
    ],
    "secondary_muscles": [
      "obliquos"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Rotação Torácica",
      "Thoracic Rotation"
    ],
    "category": "Mobilidade",
    "muscle_primary": "Coluna Torácica",
    "muscle_secondary": [
      "Oblíquos"
    ],
    "training_style": [
      "Mobilidade",
      "Reabilitação"
    ],
    "type": "Mobilidade"
  },
  {
    "id": "hamstring-stretch",
    "name": "Alongamento de Isquiotibial",
    "name_en": "Hamstring Stretch",
    "primary_muscles": [
      "isquiotibiais"
    ],
    "secondary_muscles": [],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Alongamento de Isquiotibial",
      "Hamstring Stretch"
    ],
    "category": "Mobilidade",
    "muscle_primary": "Isquiotibiais",
    "muscle_secondary": [],
    "training_style": [
      "Flexibilidade"
    ],
    "type": "Mobilidade"
  },
  {
    "id": "pigeon-pose",
    "name": "Pigeon Pose",
    "name_en": "Pigeon Pose",
    "primary_muscles": [
      "gluteo_medio"
    ],
    "secondary_muscles": [
      "flexores_do_quadril",
      "piriforme"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Pigeon Pose",
      "Pigeon Pose"
    ],
    "category": "Mobilidade",
    "muscle_primary": "Glúteo Médio",
    "muscle_secondary": [
      "Flexores do Quadril",
      "Piriforme"
    ],
    "training_style": [
      "Mobilidade",
      "Yoga"
    ],
    "type": "Mobilidade"
  },
  {
    "id": "cat-cow",
    "name": "Cat-Cow",
    "name_en": "Cat-Cow",
    "primary_muscles": [
      "coluna"
    ],
    "secondary_muscles": [
      "core",
      "pescoco"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Cat-Cow",
      "Cat-Cow"
    ],
    "category": "Mobilidade",
    "muscle_primary": "Coluna",
    "muscle_secondary": [
      "Core",
      "Pescoço"
    ],
    "training_style": [
      "Mobilidade",
      "Yoga",
      "Reabilitação"
    ],
    "type": "Mobilidade"
  },
  {
    "id": "foam-rolling",
    "name": "Foam Rolling",
    "name_en": "Foam Rolling",
    "primary_muscles": [
      "variado"
    ],
    "secondary_muscles": [],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Foam Rolling",
      "Foam Rolling"
    ],
    "category": "Mobilidade",
    "muscle_primary": "Variado",
    "muscle_secondary": [],
    "training_style": [
      "Recuperação",
      "Mobilidade"
    ],
    "type": "Recuperação"
  },
  {
    "id": "barbell-shrug",
    "name": "Encolhimento de Ombros",
    "name_en": "Barbell Shrug",
    "primary_muscles": [
      "trapezio_superior"
    ],
    "secondary_muscles": [
      "levantador_da_escapula"
    ],
    "equipment": [
      "barbell",
      "dumbbell"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Encolhimento de Ombros",
      "Barbell Shrug"
    ],
    "category": "Trapézio",
    "muscle_primary": "Trapézio Superior",
    "muscle_secondary": [
      "Levantador da Escápula"
    ],
    "training_style": [
      "Isolamento",
      "Hipertrofia"
    ],
    "type": "Isolamento"
  },
  {
    "id": "cable-shrug",
    "name": "Encolhimento no Cabo",
    "name_en": "Cable Shrug",
    "primary_muscles": [
      "trapezio_superior"
    ],
    "secondary_muscles": [],
    "equipment": [
      "cable"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Encolhimento no Cabo",
      "Cable Shrug"
    ],
    "category": "Trapézio",
    "muscle_primary": "Trapézio Superior",
    "muscle_secondary": [],
    "training_style": [
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "clamshell",
    "name": "Clamshell",
    "name_en": "Clamshell",
    "primary_muscles": [
      "gluteo_medio"
    ],
    "secondary_muscles": [
      "gluteo_minimo",
      "piriforme"
    ],
    "equipment": [
      "band"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Clamshell",
      "Clamshell"
    ],
    "category": "Glúteos",
    "muscle_primary": "Glúteo Médio",
    "muscle_secondary": [
      "Glúteo Mínimo",
      "Piriforme"
    ],
    "training_style": [
      "Reabilitação",
      "Mobilidade"
    ],
    "type": "Isolamento"
  },
  {
    "id": "fire-hydrant",
    "name": "Fire Hydrant",
    "name_en": "Fire Hydrant",
    "primary_muscles": [
      "gluteo_medio"
    ],
    "secondary_muscles": [],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Fire Hydrant",
      "Fire Hydrant"
    ],
    "category": "Glúteos",
    "muscle_primary": "Glúteo Médio",
    "muscle_secondary": [],
    "training_style": [
      "Calistenia",
      "Reabilitação"
    ],
    "type": "Isolamento"
  },
  {
    "id": "hip-adduction-machine",
    "name": "Adução na Máquina",
    "name_en": "Hip Adduction Machine",
    "primary_muscles": [
      "adutores"
    ],
    "secondary_muscles": [],
    "equipment": [
      "machine"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Adução na Máquina",
      "Hip Adduction Machine"
    ],
    "category": "Adutores",
    "muscle_primary": "Adutores",
    "muscle_secondary": [],
    "training_style": [
      "Isolamento"
    ],
    "type": "Isolamento"
  },
  {
    "id": "copenhagen-plank",
    "name": "Copenhagen Plank",
    "name_en": "Copenhagen Plank",
    "primary_muscles": [
      "adutores"
    ],
    "secondary_muscles": [
      "core",
      "obliquos"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Copenhagen Plank",
      "Copenhagen Plank"
    ],
    "category": "Adutores",
    "muscle_primary": "Adutores",
    "muscle_secondary": [
      "Core",
      "Oblíquos"
    ],
    "training_style": [
      "Funcional",
      "Força"
    ],
    "type": "Isométrico"
  },
  {
    "id": "sumo-deadlift",
    "name": "Sumo Deadlift",
    "name_en": "Sumo Deadlift",
    "primary_muscles": [
      "adutores"
    ],
    "secondary_muscles": [
      "gluteos",
      "isquiotibiais",
      "quadriceps"
    ],
    "equipment": [
      "barbell"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Sumo Deadlift",
      "Sumo Deadlift"
    ],
    "category": "Adutores",
    "muscle_primary": "Adutores",
    "muscle_secondary": [
      "Glúteos",
      "Isquiotibiais",
      "Quadríceps"
    ],
    "training_style": [
      "Força",
      "Powerlifting"
    ],
    "type": "Composto"
  },
  {
    "id": "neck-flexion",
    "name": "Elevação de Pescoço",
    "name_en": "Neck Flexion",
    "primary_muscles": [
      "esternocleidomastoideo"
    ],
    "secondary_muscles": [
      "trapezio_superior"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Elevação de Pescoço",
      "Neck Flexion"
    ],
    "category": "Pescoço",
    "muscle_primary": "Esternocleidomastoideo",
    "muscle_secondary": [
      "Trapézio Superior"
    ],
    "training_style": [
      "Isolamento",
      "Reabilitação"
    ],
    "type": "Isolamento"
  },
  {
    "id": "downward-dog",
    "name": "Cachorro Olhando para Baixo",
    "name_en": "Downward Dog",
    "primary_muscles": [
      "isquiotibiais"
    ],
    "secondary_muscles": [
      "ombros",
      "panturrilha",
      "eretores"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Cachorro Olhando para Baixo",
      "Downward Dog"
    ],
    "category": "Yoga",
    "muscle_primary": "Isquiotibiais",
    "muscle_secondary": [
      "Ombros",
      "Panturrilha",
      "Eretores"
    ],
    "training_style": [
      "Yoga",
      "Mobilidade",
      "Flexibilidade"
    ],
    "type": "Mobilidade"
  },
  {
    "id": "side-plank-with-rotation",
    "name": "Prancha Lateral com Rotação",
    "name_en": "Side Plank with Rotation",
    "primary_muscles": [
      "obliquos"
    ],
    "secondary_muscles": [
      "core",
      "ombros"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Prancha Lateral com Rotação",
      "Side Plank with Rotation"
    ],
    "category": "Core",
    "muscle_primary": "Oblíquos",
    "muscle_secondary": [
      "Core",
      "Ombros"
    ],
    "training_style": [
      "Funcional",
      "Pilates"
    ],
    "type": "Composto"
  },
  {
    "id": "single-leg-glute-bridge",
    "name": "Ponte com Elevação de Perna",
    "name_en": "Single-Leg Glute Bridge",
    "primary_muscles": [
      "gluteo_maximo"
    ],
    "secondary_muscles": [
      "isquiotibiais",
      "core"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Ponte com Elevação de Perna",
      "Single-Leg Glute Bridge"
    ],
    "category": "Glúteos",
    "muscle_primary": "Glúteo Máximo",
    "muscle_secondary": [
      "Isquiotibiais",
      "Core"
    ],
    "training_style": [
      "Calistenia",
      "Pilates"
    ],
    "type": "Isolamento"
  },
  {
    "id": "roll-up",
    "name": "Roll-Up",
    "name_en": "Roll-Up",
    "primary_muscles": [
      "reto_abdominal"
    ],
    "secondary_muscles": [
      "flexores_do_quadril",
      "core"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Roll-Up",
      "Roll-Up"
    ],
    "category": "Core",
    "muscle_primary": "Reto Abdominal",
    "muscle_secondary": [
      "Flexores do Quadril",
      "Core"
    ],
    "training_style": [
      "Pilates"
    ],
    "type": "Isolamento"
  },
  {
    "id": "depth-jump",
    "name": "Salto em Profundidade",
    "name_en": "Depth Jump",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "gluteos",
      "panturrilha"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Salto em Profundidade",
      "Depth Jump"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Glúteos",
      "Panturrilha"
    ],
    "training_style": [
      "Pliométrico",
      "Esporte"
    ],
    "type": "Pliométrico"
  },
  {
    "id": "lateral-bound",
    "name": "Salto Lateral",
    "name_en": "Lateral Bound",
    "primary_muscles": [
      "gluteo_medio"
    ],
    "secondary_muscles": [
      "quadriceps",
      "panturrilha"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Salto Lateral",
      "Lateral Bound"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Glúteo Médio",
    "muscle_secondary": [
      "Quadríceps",
      "Panturrilha"
    ],
    "training_style": [
      "Pliométrico",
      "Esporte",
      "HIIT"
    ],
    "type": "Pliométrico"
  },
  {
    "id": "medicine-ball-slam",
    "name": "Medicine Ball Slam",
    "name_en": "Medicine Ball Slam",
    "primary_muscles": [
      "core"
    ],
    "secondary_muscles": [
      "ombros",
      "dorsais",
      "quadriceps"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Medicine Ball Slam",
      "Medicine Ball Slam"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Core",
    "muscle_secondary": [
      "Ombros",
      "Dorsais",
      "Quadríceps"
    ],
    "training_style": [
      "HIIT",
      "Funcional",
      "Explosão"
    ],
    "type": "Funcional"
  },
  {
    "id": "medicine-ball-throw",
    "name": "Lançamento de Medicine Ball",
    "name_en": "Medicine Ball Throw",
    "primary_muscles": [
      "peitoral"
    ],
    "secondary_muscles": [
      "core",
      "ombros"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Lançamento de Medicine Ball",
      "Medicine Ball Throw"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Peitoral",
    "muscle_secondary": [
      "Core",
      "Ombros"
    ],
    "training_style": [
      "HIIT",
      "Funcional"
    ],
    "type": "Funcional"
  },
  {
    "id": "lateral-shuffle",
    "name": "Corrida Lateral",
    "name_en": "Lateral Shuffle",
    "primary_muscles": [
      "gluteo_medio"
    ],
    "secondary_muscles": [
      "quadriceps",
      "panturrilha"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Corrida Lateral",
      "Lateral Shuffle"
    ],
    "category": "Cardio",
    "muscle_primary": "Glúteo Médio",
    "muscle_secondary": [
      "Quadríceps",
      "Panturrilha"
    ],
    "training_style": [
      "Esporte",
      "HIIT",
      "Agilidade"
    ],
    "type": "Cardio"
  },
  {
    "id": "agility-ladder",
    "name": "Corrida em Zigue-Zague",
    "name_en": "Agility Ladder",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "panturrilha",
      "core"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "beginner",
    "video_youtube_ids": [],
    "aliases": [
      "Corrida em Zigue-Zague",
      "Agility Ladder"
    ],
    "category": "Cardio",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Panturrilha",
      "Core"
    ],
    "training_style": [
      "Agilidade",
      "Esporte",
      "HIIT"
    ],
    "type": "Cardio"
  },
  {
    "id": "snatch",
    "name": "Arremesso (Snatch)",
    "name_en": "Snatch",
    "primary_muscles": [
      "corpo_inteiro"
    ],
    "secondary_muscles": [
      "ombros",
      "quadriceps",
      "core",
      "dorsais"
    ],
    "equipment": [
      "barbell"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Arremesso (Snatch)",
      "Snatch"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Corpo Inteiro",
    "muscle_secondary": [
      "Ombros",
      "Quadríceps",
      "Core",
      "Dorsais"
    ],
    "training_style": [
      "Levantamento Olímpico",
      "Força"
    ],
    "type": "Composto"
  },
  {
    "id": "clean-jerk",
    "name": "Arranco (Clean & Jerk)",
    "name_en": "Clean & Jerk",
    "primary_muscles": [
      "corpo_inteiro"
    ],
    "secondary_muscles": [
      "ombros",
      "quadriceps",
      "core",
      "dorsais"
    ],
    "equipment": [
      "barbell"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Arranco (Clean & Jerk)",
      "Clean & Jerk"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Corpo Inteiro",
    "muscle_secondary": [
      "Ombros",
      "Quadríceps",
      "Core",
      "Dorsais"
    ],
    "training_style": [
      "Levantamento Olímpico",
      "Força"
    ],
    "type": "Composto"
  },
  {
    "id": "power-clean",
    "name": "Power Clean",
    "name_en": "Power Clean",
    "primary_muscles": [
      "gluteos"
    ],
    "secondary_muscles": [
      "dorsais",
      "quadriceps",
      "ombros"
    ],
    "equipment": [
      "barbell"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Power Clean",
      "Power Clean"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Glúteos",
    "muscle_secondary": [
      "Dorsais",
      "Quadríceps",
      "Ombros"
    ],
    "training_style": [
      "Levantamento Olímpico",
      "Força",
      "Esporte"
    ],
    "type": "Composto"
  },
  {
    "id": "muscle-up",
    "name": "Muscle-Up",
    "name_en": "Muscle-Up",
    "primary_muscles": [
      "dorsais"
    ],
    "secondary_muscles": [
      "biceps",
      "triceps",
      "core"
    ],
    "equipment": [
      "bodyweight"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Muscle-Up",
      "Muscle-Up"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Dorsais",
    "muscle_secondary": [
      "Bíceps",
      "Tríceps",
      "Core"
    ],
    "training_style": [
      "Calistenia",
      "Ginástica"
    ],
    "type": "Composto"
  },
  {
    "id": "front-lever",
    "name": "Front Lever",
    "name_en": "Front Lever",
    "primary_muscles": [
      "latissimo_do_dorso"
    ],
    "secondary_muscles": [
      "core",
      "biceps"
    ],
    "equipment": [
      "bodyweight"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Front Lever",
      "Front Lever"
    ],
    "category": "Costas",
    "muscle_primary": "Latíssimo do Dorso",
    "muscle_secondary": [
      "Core",
      "Bíceps"
    ],
    "training_style": [
      "Calistenia",
      "Ginástica"
    ],
    "type": "Isométrico"
  },
  {
    "id": "back-lever",
    "name": "Back Lever",
    "name_en": "Back Lever",
    "primary_muscles": [
      "biceps"
    ],
    "secondary_muscles": [
      "peitoral",
      "core"
    ],
    "equipment": [
      "bodyweight"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Back Lever",
      "Back Lever"
    ],
    "category": "Costas",
    "muscle_primary": "Bíceps",
    "muscle_secondary": [
      "Peitoral",
      "Core"
    ],
    "training_style": [
      "Calistenia",
      "Ginástica"
    ],
    "type": "Isométrico"
  },
  {
    "id": "planche",
    "name": "Planche",
    "name_en": "Planche",
    "primary_muscles": [
      "ombros"
    ],
    "secondary_muscles": [
      "core",
      "peitoral",
      "triceps"
    ],
    "equipment": [
      "bodyweight",
      "none"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Planche",
      "Planche"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Ombros",
    "muscle_secondary": [
      "Core",
      "Peitoral",
      "Tríceps"
    ],
    "training_style": [
      "Calistenia",
      "Ginástica"
    ],
    "type": "Isométrico"
  },
  {
    "id": "human-flag",
    "name": "Human Flag",
    "name_en": "Human Flag",
    "primary_muscles": [
      "obliquos"
    ],
    "secondary_muscles": [
      "dorsais",
      "ombros"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Human Flag",
      "Human Flag"
    ],
    "category": "Core",
    "muscle_primary": "Oblíquos",
    "muscle_secondary": [
      "Dorsais",
      "Ombros"
    ],
    "training_style": [
      "Calistenia",
      "Ginástica"
    ],
    "type": "Isométrico"
  },
  {
    "id": "one-arm-push-up",
    "name": "One-Arm Push-up",
    "name_en": "One-Arm Push-up",
    "primary_muscles": [
      "peitoral_maior"
    ],
    "secondary_muscles": [
      "triceps",
      "core",
      "deltoide"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "One-Arm Push-up",
      "One-Arm Push-up"
    ],
    "category": "Peito",
    "muscle_primary": "Peitoral Maior",
    "muscle_secondary": [
      "Tríceps",
      "Core",
      "Deltoide"
    ],
    "training_style": [
      "Calistenia"
    ],
    "type": "Composto"
  },
  {
    "id": "one-arm-pull-up",
    "name": "One-Arm Pull-up",
    "name_en": "One-Arm Pull-up",
    "primary_muscles": [
      "latissimo_do_dorso"
    ],
    "secondary_muscles": [
      "biceps",
      "core"
    ],
    "equipment": [
      "bodyweight"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "One-Arm Pull-up",
      "One-Arm Pull-up"
    ],
    "category": "Costas",
    "muscle_primary": "Latíssimo do Dorso",
    "muscle_secondary": [
      "Bíceps",
      "Core"
    ],
    "training_style": [
      "Calistenia",
      "Ginástica"
    ],
    "type": "Composto"
  },
  {
    "id": "pistol-squat",
    "name": "Pistol Squat",
    "name_en": "Pistol Squat",
    "primary_muscles": [
      "quadriceps"
    ],
    "secondary_muscles": [
      "gluteos",
      "core",
      "tornozelo"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Pistol Squat",
      "Pistol Squat"
    ],
    "category": "Quadríceps",
    "muscle_primary": "Quadríceps",
    "muscle_secondary": [
      "Glúteos",
      "Core",
      "Tornozelo"
    ],
    "training_style": [
      "Calistenia"
    ],
    "type": "Composto"
  },
  {
    "id": "ring-dips",
    "name": "Ring Dips",
    "name_en": "Ring Dips",
    "primary_muscles": [
      "peitoral_maior"
    ],
    "secondary_muscles": [
      "triceps",
      "core"
    ],
    "equipment": [
      "bodyweight"
    ],
    "difficulty": "advanced",
    "video_youtube_ids": [],
    "aliases": [
      "Ring Dips",
      "Ring Dips"
    ],
    "category": "Peito",
    "muscle_primary": "Peitoral Maior",
    "muscle_secondary": [
      "Tríceps",
      "Core"
    ],
    "training_style": [
      "Calistenia",
      "CrossFit"
    ],
    "type": "Composto"
  },
  {
    "id": "tuck-planche",
    "name": "Tuck Planche",
    "name_en": "Tuck Planche",
    "primary_muscles": [
      "ombros"
    ],
    "secondary_muscles": [
      "core",
      "peitoral"
    ],
    "equipment": [
      "none"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Tuck Planche",
      "Tuck Planche"
    ],
    "category": "Corpo Inteiro",
    "muscle_primary": "Ombros",
    "muscle_secondary": [
      "Core",
      "Peitoral"
    ],
    "training_style": [
      "Calistenia",
      "Ginástica"
    ],
    "type": "Isométrico"
  },
  {
    "id": "jefferson-curl",
    "name": "Jefferson Curl",
    "name_en": "Jefferson Curl",
    "primary_muscles": [
      "eretores_da_espinha"
    ],
    "secondary_muscles": [
      "isquiotibiais",
      "core"
    ],
    "equipment": [
      "dumbbell",
      "barbell"
    ],
    "difficulty": "intermediate",
    "video_youtube_ids": [],
    "aliases": [
      "Jefferson Curl",
      "Jefferson Curl"
    ],
    "category": "Costas",
    "muscle_primary": "Eretores da Espinha",
    "muscle_secondary": [
      "Isquiotibiais",
      "Core"
    ],
    "training_style": [
      "Mobilidade",
      "Reabilitação"
    ],
    "type": "Mobilidade"
  }
];
