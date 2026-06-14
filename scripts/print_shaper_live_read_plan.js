/**
 * @file print_shaper_live_read_plan.js
 * @description Print phased MUME commands for reading a live zone into Shaper.
 */

// --- Argument Section ---
const args = process.argv.slice(2);
const takeValue = flag => {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`);
  return value;
};
const hasFlag = flag => args.includes(flag);
const zone = Number(takeValue('--zone'));
const rooms = (takeValue('--rooms') ?? '').split(',').map(item => item.trim()).filter(Boolean);
const keywords = (takeValue('--zone-keywords') ?? '').split(',').map(item => item.trim()).filter(Boolean);
const includeGrid = hasFlag('--grid');
const commandsOnly = hasFlag('--commands-only');

if (hasFlag('--help') || !Number.isInteger(zone) || zone < 0) {
  console.log([
    'Usage:',
    '  node scripts/print_shaper_live_read_plan.js --zone 31 --grid',
    '  node scripts/print_shaper_live_read_plan.js --zone 31 --rooms 31:00,31:04 --zone-keywords map,history',
    '',
    'Options:',
    '  --zone           Zone number to read.',
    '  --grid           Include the normal 00-99 room grid scan.',
    '  --rooms          Comma-separated explicit room numbers.',
    '  --zone-keywords  Comma-separated /info z keywords to read.',
    '  --commands-only  Print one MUME command per line instead of JSON.'
  ].join('\n'));
  process.exit(hasFlag('--help') ? 0 : 1);
}

// --- Plan Section ---
const unique = values => Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
const gridRooms = zoneNumber => Array.from({ length: 100 }, (_, index) => {
  const y = Math.floor(index / 10);
  const x = index % 10;
  return `${zoneNumber}:${x}${y}`;
});
const roomCommands = room => [
  { phase: 'room-scan', scope: 'room', target: room, command: `/at ${room} /stat room full` },
  { phase: 'room-scan', scope: 'room', target: room, command: `/at ${room} /com list -commands` },
  { phase: 'room-scan', scope: 'room', target: room, command: `/lib room ${room} list -commands` }
];
const plan = [
  { phase: 'zone-discovery', scope: 'zone', target: String(zone), command: `/stat zone ${zone}` },
  { phase: 'zone-discovery', scope: 'zone', target: String(zone), command: `/zone ${zone} list` },
  { phase: 'zone-discovery', scope: 'zone-info', target: String(zone), command: `/info z ${zone} list` },
  ...unique(keywords).map(keyword => ({ phase: 'zone-info', scope: 'zone-info', target: keyword, command: `/info z ${zone} ${keyword}` })),
  ...unique([...(includeGrid ? gridRooms(zone) : []), ...rooms]).flatMap(roomCommands)
];

if (commandsOnly) {
  console.log(plan.map(item => item.command).join('\n'));
} else {
  console.log(JSON.stringify({ zoneNumber: zone, commands: plan }, null, 2));
}
