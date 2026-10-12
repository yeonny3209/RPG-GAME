// 맵 검사: 줄 길이, 모르는 글자, 시작점에서 출구/NPC/상자/몬스터까지 갈 수 있는지
import { MAPS, LEGEND } from '../src/data/maps.js';

let ok = true;
for (const [id, m] of Object.entries(MAPS)) {
  const h = m.rows.length, w = m.rows[0].length;
  m.rows.forEach((r, i) => {
    if (r.length !== w) { ok = false; console.log(`${id}: row ${i} length ${r.length} != ${w}`); }
    for (const ch of r) if (!LEGEND[ch]) { ok = false; console.log(`${id}: unknown char '${ch}' row ${i}`); }
  });
  const solid = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return true;
    const L = LEGEND[m.rows[y][x]];
    return !L || L.t !== undefined;
  };
  // 바위는 막힌 것으로 치지 않음 (마법사가 치워 줌)
  const start = Object.values(m.spawns)[0];
  const sx = Math.floor(start[0] + 0.5), sy = Math.floor(start[1]);
  const seen = new Set([sx + ',' + sy]);
  const q = [[sx, sy]];
  if (solid(sx, sy)) { ok = false; console.log(`${id}: spawn is solid`); }
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (!seen.has(k) && !solid(nx, ny)) { seen.add(k); q.push([nx, ny]); }
    }
  }
  const reach = (x, y) => seen.has(x + ',' + y);
  const near = (x, y) => [[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => reach(x+dx, y+dy));
  for (const [name, [x, y]] of Object.entries(m.spawns)) {
    const tx = Math.floor(x + 0.5), ty = Math.floor(y);
    if (!reach(tx, ty)) { ok = false; console.log(`${id}: spawn ${name} unreachable (${tx},${ty})`); }
  }
  for (const e of m.exits) if (!reach(e.x, e.y)) { ok = false; console.log(`${id}: exit to ${e.to} unreachable`); }
  for (const n of m.npcs) {
    if (solid(n.x, n.y)) { ok = false; console.log(`${id}: npc ${n.id} on solid`); }
    if (!near(n.x, n.y)) { ok = false; console.log(`${id}: npc ${n.id} unreachable`); }
  }
  for (const c of m.chests) {
    if (solid(c.x, c.y)) { ok = false; console.log(`${id}: chest ${c.id} on solid`); }
    if (!near(c.x, c.y)) { ok = false; console.log(`${id}: chest ${c.id} unreachable`); }
  }
  for (const mo of m.monsters) if (!reach(mo.x, mo.y)) { ok = false; console.log(`${id}: monster ${mo.type} at ${mo.x},${mo.y} bad`); }
  for (const s of m.spikes || []) if (!reach(s.x, s.y)) { ok = false; console.log(`${id}: spike bad ${s.x},${s.y}`); }
  console.log(`${id}: ${w}x${h}, reachable tiles ${seen.size}`);
}
console.log(ok ? 'ALL OK' : 'PROBLEMS FOUND');
