/**
 * Villager Name Pool
 *
 * Names randomly assigned to villagers when spawned.
 */

export const VILLAGER_NAMES = [
  'Abel', 'Ada', 'Aiden', 'Alma', 'Amos', 'Ana', 'Arden', 'Aria',
  'Ash', 'Aspen', 'Astrid', 'Atlas', 'Bard', 'Basil', 'Birch', 'Blair',
  'Blaze', 'Briar', 'Brook', 'Bryn', 'Cade', 'Cedar', 'Celia', 'Clay',
  'Clover', 'Cole', 'Coral', 'Cyrus', 'Dale', 'Dara', 'Dawn', 'Dell',
  'Dusk', 'Eden', 'Elan', 'Elder', 'Elm', 'Ember', 'Erin', 'Eve',
  'Faye', 'Fern', 'Finn', 'Flint', 'Flora', 'Forge', 'Fox', 'Frost',
  'Gale', 'Glen', 'Grace', 'Grove', 'Hale', 'Haven', 'Hawk', 'Heath',
  'Hera', 'Holly', 'Hope', 'Hugo', 'Ida', 'Iris', 'Isla', 'Ivy',
  'Jade', 'Jara', 'Jett', 'Joy', 'June', 'Kael', 'Kai', 'Kira',
  'Knox', 'Lake', 'Lark', 'Leif', 'Lily', 'Linden', 'Lore', 'Luna',
  'Lynx', 'Mace', 'Maple', 'Mara', 'Marsh', 'Maven', 'Mira', 'Moss',
  'Nara', 'Nash', 'Neve', 'Noel', 'Nova', 'Oak', 'Odin', 'Olive',
  'Onyx', 'Opal', 'Ora', 'Orion', 'Pax', 'Pearl', 'Penn', 'Petra',
  'Pike', 'Pine', 'Plum', 'Quinn', 'Rain', 'Raven', 'Reed', 'Ren',
  'Ridge', 'River', 'Robin', 'Rook', 'Rose', 'Rowan', 'Ruby', 'Rue',
  'Rune', 'Rush', 'Rust', 'Ruth', 'Sage', 'Sable', 'Shale', 'Silo',
  'Slate', 'Sol', 'Spark', 'Star', 'Stone', 'Storm', 'Swift', 'Tarn',
  'Teal', 'Terra', 'Thane', 'Thorn', 'Tide', 'Vale', 'Vera', 'Vine',
  'Violet', 'Wade', 'Warden', 'Willow', 'Winter', 'Wren', 'Wynd', 'Yara',
  'Yew', 'Zara', 'Zeke', 'Zen', 'Zephyr', 'Zinnia',
];

export function getRandomName() {
  return VILLAGER_NAMES[Math.floor(Math.random() * VILLAGER_NAMES.length)];
}
