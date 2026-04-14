import type { EquipmentCategory, EquipmentItem } from "@/types";

export const EQUIPMENT_CATALOG: EquipmentItem[] = [
  // Free Weights
  { id: "barbell", label: "Barbell", category: "free_weights" },
  { id: "dumbbell", label: "Dumbbells", category: "free_weights" },
  {
    id: "dumbbell_adjustable",
    label: "Dumbbells (adjustable)",
    category: "free_weights",
  },
  { id: "kettlebell", label: "Kettlebell", category: "free_weights" },
  { id: "plates", label: "Plates", category: "free_weights" },
  { id: "weighted_vest", label: "Weighted Vest", category: "free_weights" },
  { id: "dip_belt", label: "Dip Belt", category: "free_weights" },
  { id: "ez_bar", label: "EZ Bar", category: "free_weights" },

  // Machines & Stations
  {
    id: "machine_cable",
    label: "Cable Machine",
    category: "machines_stations",
  },
  {
    id: "machine_chest_press",
    label: "Chest Press Station",
    category: "machines_stations",
  },
  {
    id: "machine_lat_pulldown",
    label: "Lat Pulldown Station",
    category: "machines_stations",
  },
  {
    id: "machine_leg_extension",
    label: "Leg Extension Station",
    category: "machines_stations",
  },
  {
    id: "machine_leg_lift",
    label: "Leg Lift Station",
    category: "machines_stations",
  },
  {
    id: "machine_butterfly",
    label: "Butterfly Station",
    category: "machines_stations",
  },
  {
    id: "machine_pulley",
    label: "Pulley System",
    category: "machines_stations",
  },
  { id: "rack", label: "Rack", category: "machines_stations" },
  {
    id: "smith_machine",
    label: "Smith Machine",
    category: "machines_stations",
  },

  // Bodyweight & Functional
  {
    id: "bodyweight",
    label: "Bodyweight",
    category: "bodyweight_functional",
  },
  {
    id: "pullup_bar",
    label: "Pullup Bar",
    category: "bodyweight_functional",
  },
  {
    id: "dip_bars",
    label: "Dip Bars",
    category: "bodyweight_functional",
  },
  {
    id: "pushup_bars",
    label: "Pushup Bars",
    category: "bodyweight_functional",
  },
  { id: "low_bar", label: "Low Bar", category: "bodyweight_functional" },
  {
    id: "ab_wheel",
    label: "Ab Wheel",
    category: "bodyweight_functional",
  },
  {
    id: "leg_lift_station",
    label: "Leg Lift Station",
    category: "bodyweight_functional",
  },
  { id: "wall", label: "Wall", category: "bodyweight_functional" },
  { id: "pole", label: "Pole", category: "bodyweight_functional" },

  // Cardio
  { id: "treadmill", label: "Treadmill", category: "cardio" },
  { id: "exercise_bike", label: "Exercise Bike", category: "cardio" },
  { id: "outdoor_bike", label: "Outdoor Bike", category: "cardio" },
  { id: "rower", label: "Rower", category: "cardio" },
  { id: "jump_rope", label: "Jump Rope", category: "cardio" },

  // Accessories
  { id: "bench", label: "Bench", category: "accessories" },
  { id: "box", label: "Box", category: "accessories" },
  {
    id: "resistance_band",
    label: "Resistance Band",
    category: "accessories",
  },
  { id: "glute_band", label: "Glute Band", category: "accessories" },
  { id: "foam_roller", label: "Foam Roller", category: "accessories" },
  { id: "gym_ball", label: "Gym Ball", category: "accessories" },
  {
    id: "suspension_trainer",
    label: "Suspension Trainer",
    category: "accessories",
  },
  {
    id: "gliding_discs",
    label: "Gliding Discs",
    category: "accessories",
  },
  {
    id: "stick_towel_cord",
    label: "Stick, Towel or Cord",
    category: "accessories",
  },
  { id: "none", label: "No Equipment", category: "accessories" },
];

export const EQUIPMENT_BY_CATEGORY: Record<EquipmentCategory, EquipmentItem[]> = {
  free_weights: EQUIPMENT_CATALOG.filter(
    (equipment) => equipment.category === "free_weights",
  ),
  machines_stations: EQUIPMENT_CATALOG.filter(
    (equipment) => equipment.category === "machines_stations",
  ),
  bodyweight_functional: EQUIPMENT_CATALOG.filter(
    (equipment) => equipment.category === "bodyweight_functional",
  ),
  cardio: EQUIPMENT_CATALOG.filter((equipment) => equipment.category === "cardio"),
  accessories: EQUIPMENT_CATALOG.filter(
    (equipment) => equipment.category === "accessories",
  ),
};

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  free_weights: "Free Weights",
  machines_stations: "Machines & Stations",
  bodyweight_functional: "Bodyweight & Functional",
  cardio: "Cardio",
  accessories: "Accessories",
};
