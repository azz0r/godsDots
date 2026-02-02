/**
 * Dev Panel Configuration
 *
 * Constants and configurations for the development panel UI.
 */

export const GAME_SPEEDS = [0.5, 1, 2, 5, 10];

export const BELIEF_AMOUNTS = [100, 1000];

export const SPAWN_AMOUNTS = [10, 50];

export const PASSABLE_SEARCH_RADIUS = 75;

export const POLL_INTERVAL_MS = 250;

export const FPS_THRESHOLDS = {
  GOOD: 55,
  WARN: 30,
};

export const FPS_COLORS = {
  GOOD: '#4ade80',
  WARN: '#facc15',
  BAD: '#ef4444',
};

export const BUILDING_BUTTONS = [
  { id: 'farm', label: 'Farm (30)', key: 'F' },
  { id: 'house', label: 'House (20)', key: 'H' },
  { id: 'wall', label: 'Wall (5)', key: 'W' },
];

export const TARGETING_STYLE = {
  padding: '6px 8px',
  backgroundColor: '#1a3a1a',
  border: '1px solid #4ade80',
  borderRadius: '4px',
  marginBottom: '8px',
  color: '#4ade80',
  fontSize: '12px',
};

export const WARNING_STYLE = {
  padding: '8px',
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '4px',
  marginBottom: '8px',
  color: '#991b1b',
  fontSize: '12px',
};
