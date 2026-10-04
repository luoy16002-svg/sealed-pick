// SPDX-License-Identifier: Apache-2.0
// Sealed Pick, browser table. Three player clients share one Simulator, which executes the generated Compact circuits
// in this page. Each "phone" owns one client and its private state; the board in the middle shows only what the
// public ledger holds.
import '@fontsource/bricolage-grotesque/400.css';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/800.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './style.css';
import { SealedPickClient, Simulator } from '@sealed-pick/core';
import type { RoomEvent, RoomSnapshot } from '@sealed-pick/core';
import { PROMPTS } from './prompts';
import { sealSvg } from './seal';

type Player = {
  name: string;
  color: string;
  client: SealedPickClient;
  pick: number | null; //       highlighted on this phone, not sealed yet
  sealed: number | null; //     the choice held in this phone's private state
  busy: boolean;
  note: { kind: 'error' | 'reject' | 'info'; text: string } | null;
};
type LogLine = { time: string; circuit: string; detail: string; kind: 'ok' | 'reject' };

const sim = new Simulator();
// The page holds all three phones, so it keeps each player's secret too; the "modified client" demo below needs it.
const secrets = [0, 1, 2].map(() => crypto.getRandomValues(new Uint8Array(32)));
const players: Player[] = [
  { name: 'Ama', color: '#e8b14f', client: new SealedPickClient(sim, secrets[0]), pick: null, sealed: null, busy: false, note: null },
  { name: 'Lior', color: '#5fb8a2', client: new SealedPickClient(sim, secrets[1]), pick: null, sealed: null, busy: false, note: null },
  { name: 'Mei', color: '#86a9e3', client: new SealedPickClient(sim, secrets[2]), pick: null, sealed: null, busy: false, note: null },
];
let room: RoomSnapshot | null = null;
let round = 0, streak = 0, best = 0, promptIndex = -1;
let revealing = false, autoplay = false;
const log: LogLine[] = [];

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const short = (hex: string | null, a = 6, b = 4) => (hex ? `${hex.slice(0, a)}…${hex.slice(-b)}` : '—');
const clock = () => new Date().toLocaleTimeString('en-GB', { hour12: false });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const prompt = () => PROMPTS[promptIndex];
const reason = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  return m.replace(/^.*failed assert:\s*/i, '').replace(/^Error:\s*/, '').trim();
};

// ---------------------------------------------------------------------------------------------- ledger events
sim.subscribe((ev: RoomEvent) => {
  if (room && ev.room.id !== room.id && ev.type !== 'roomCreated') return;
  room = ev.room;
  const seat = (i: number) => `seat ${i}`;
  if (ev.type === 'roomCreated') push('createRoom', `room ${short(ev.room.id)} · ${ev.room.optionCount} options · ${seat(0)} taken`);
  if (ev.type === 'playerJoined') push('joinRoom', `${seat(ev.room.joined - 1)} taken${ev.room.joined === 3 ? ' · lobby closed' : ''}`);
  if (ev.type === 'choiceCommitted') {
    const i = ev.room.committed.findIndex((c, k) => c && !logSealed.has(k));
    if (i >= 0) { logSealed.add(i); push('commit', `${seat(i)} · seal ${short(ev.room.commitments[i], 8, 4)}`); }
  }
  if (ev.type === 'roomRevealed' && ev.room.results) push('reveal', `3 openings checked against 3 seals · score ${ev.room.results.score}`);
  render();
});
let logSealed = new Set<number>();

function push(circuit: string, detail: string, kind: LogLine['kind'] = 'ok') {
  log.unshift({ time: clock(), circuit, detail, kind });
  log.length = Math.min(log.length, 9);
}

// ---------------------------------------------------------------------------------------------- game actions
async function newRound() {
  revealing = false;
  round += 1;
  let next = Math.floor(Math.random() * PROMPTS.length);
  if (next === promptIndex) next = (next + 1) % PROMPTS.length;
  promptIndex = round === 1 ? 0 : next;
  players.forEach((p) => { p.pick = null; p.sealed = null; p.busy = false; p.note = null; });
  logSealed = new Set();
  room = null;
  render();
  const created = await players[0].client.createRoom(prompt().options.length);
  await players[1].client.join(created.id);
  await players[2].client.join(created.id);
}

async function seal(i: number) {
  const p = players[i];
  if (!room || p.pick === null || p.busy) return;
  p.busy = true; p.note = null; render();
  try {
    await p.client.commit(room.id, p.pick);
    p.sealed = p.pick;
  } catch (e) {
    p.note = { kind: 'error', text: reason(e) };
  } finally {
    p.busy = false; render();
  }
}

/**
 * A modified client: it skips SealedPickClient's own checks and hands the circuit a fresh opening with a different
 * choice for a seat that is already sealed, using that player's real secret. The Compact contract must refuse it.
 */
async function tryChange(i: number) {
  const p = players[i];
  if (!room || p.sealed === null) return;
  const other = (p.sealed + 1) % room.optionCount;
  const forged = { secret: secrets[i], openings: { [room.id]: { choice: BigInt(other), nonce: crypto.getRandomValues(new Uint8Array(32)) } }, batches: {} };
  try {
    await sim.execute('commit', room.id, forged, BigInt(i));
    p.note = { kind: 'error', text: 'The contract accepted a second commitment. This should never happen.' };
  } catch (e) {
    const why = reason(e);
    p.note = { kind: 'reject', text: `A modified app skipped its own checks and asked the contract to swap ${p.name}'s seal. The circuit refused: “${why}”.` };
    push('commit', `seat ${i} · forged second choice refused by the circuit: ${why}`, 'reject');
  }
  render();
}

async function breakSeals() {
  if (!room || room.phase !== 'ready' || revealing) return;
  revealing = true; render();
  try {
    // Each phone releases its opening only now that every seal is on the ledger.
    const shares = await Promise.all(players.map((p) => p.client.exportOpening(room!.id)));
    await players[0].client.reveal(room.id, shares);
    const res = (await players[0].client.readResults(room.id))!;
    if (res.matched) { streak += 1; best = Math.max(best, streak); } else streak = 0;
  } catch (e) {
    players[0].note = { kind: 'error', text: reason(e) };
  } finally {
    revealing = false; render();
  }
}

/** Plays one round by itself (used for recordings): picks lean towards the same answer, as real players do. */
async function playRound() {
  if (autoplay) return;
  autoplay = true; render();
  try {
    if (!room || room.phase === 'revealed') { await newRound(); await sleep(900); }
    const n = room!.optionCount;
    const focal = Math.floor(Math.random() * n);
    for (const i of [0, 2, 1]) {
      if (players[i].sealed !== null) continue;
      players[i].pick = Math.random() < 0.72 ? focal : Math.floor(Math.random() * n);
      render(); await sleep(650);
      await seal(i); await sleep(900);
    }
    await sleep(500);
    if (new URLSearchParams(location.search).get('autoplay') !== 'sealed') await breakSeals();
  } finally {
    autoplay = false; render();
  }
}

// ---------------------------------------------------------------------------------------------- rendering
const PHASES: RoomSnapshot['phase'][] = ['lobby', 'committing', 'ready', 'revealed'];
const PHASE_LABEL: Record<RoomSnapshot['phase'], string> = { lobby: 'Lobby', committing: 'Sealing', ready: 'All sealed', revealed: 'Revealed' };

function phoneScreen(i: number): string {
  const p = players[i];
  if (!room || room.joined <= i) return `<div class="phone-wait">Joining the room…</div>`;
  const opts = prompt().options;
  const sealHex = room.commitments[i] ?? '00';
  if (room.phase === 'revealed' && room.results) {
    const c = room.results.choices[i];
    const others = room.results.choices.filter((_, k) => k !== i).map((k) => `“${esc(opts[k])}”`).join(' and ');
    return `<div class="letter open ${room.results.matched ? 'match' : 'miss'}">
      <div class="envelope open">
        <div class="card"><span>Revealed</span><b>${esc(opts[c])}</b></div>
        <div class="pocket"></div>
        <div class="seal-wrap broken"><div class="half l">${sealSvg(sealHex, 92)}</div><div class="half r">${sealSvg(sealHex, 92)}</div></div>
      </div>
      <div class="letter-label ${room.results.matched ? '' : 'long'}">${room.results.matched ? 'Same pick as the other two.' : `The others picked ${others}.`}</div>
      <div class="private after"><span class="private-tag">what went public</span><span class="private-sub">Only the choice. The nonce went privately to whoever broke the seals and was checked inside the reveal circuit; it is never written to the ledger. ${esc(p.name)}'s player secret never left this phone.</span></div>
    </div>`;
  }
  if (p.sealed !== null || room.committed[i]) {
    const pick = p.sealed !== null ? opts[p.sealed] : '?';
    return `<div class="letter sealed">
      <div class="envelope"><div class="flap"></div><div class="seal-wrap stamp">${sealSvg(sealHex, 96)}</div></div>
      <div class="letter-label">Sealed. The ledger holds only this seal.</div>
      <div class="private"><span class="private-tag">only on ${esc(p.name)}'s phone</span><b>${esc(pick)}</b><span class="private-sub">plus a random 32-byte nonce, in private state</span></div>
      <button class="link" data-act="change" data-i="${i}">Try to swap it with a modified app</button>
    </div>`;
  }
  const can = room.phase === 'committing';
  return `<div class="hand">
    <div class="hand-label">Your pick · only you see it</div>
    <div class="options ${opts.length === 2 ? 'two' : ''}">
      ${opts.map((o, k) => `<button class="opt ${p.pick === k ? 'on' : ''}" data-act="pick" data-i="${i}" data-k="${k}" ${can ? '' : 'disabled'}>${esc(o)}</button>`).join('')}
    </div>
    <button class="seal-btn" data-act="seal" data-i="${i}" ${p.pick === null || p.busy || !can ? 'disabled' : ''}>${p.busy ? 'Sealing…' : 'Seal my pick'}</button>
  </div>`;
}

function phoneTop(i: number): string {
  const p = players[i];
  const pid = room && room.joined > i ? p.client.playerId(room.id) : null;
  return `<span class="dot"></span><span class="who">${esc(p.name)}</span><span class="pid mono" title="Seat pseudonym on the public ledger">seat ${i} · ${short(pid, 4, 4)}</span>`;
}

const phoneNote = (i: number) => (players[i].note ? `<div class="note ${players[i].note!.kind}">${esc(players[i].note!.text)}</div>` : '');

function boardRows(): string {
  return [0, 1, 2].map((i) => {
    const c = room?.commitments[i] ?? null;
    const joined = !!room && room.joined > i;
    const choice = room?.results ? esc(prompt().options[room.results.choices[i]]) : '';
    return `<div class="row ${c ? 'has' : ''} ${choice ? 'shown' : ''}" style="--who:${players[i].color}">
      <span class="dot"></span><span class="mono pseud">${joined ? short(room!.players[i], 6, 4) : 'empty seat'}</span>
      <span class="mono seal-hash">${c ? short(c, 10, 6) : joined ? 'no seal yet' : ''}</span>
      <span class="reveal-cell">${choice}</span>
    </div>`;
  }).join('');
}

function boardAction(): string {
  const ph = room?.phase ?? 'lobby';
  const left = room ? 3 - room.committedCount : 3;
  if (ph === 'ready') return `<button class="primary" data-act="reveal" ${revealing || autoplay ? 'disabled' : ''}>${revealing ? 'Breaking the seals…' : 'Break the seals'}</button>`;
  if (ph === 'revealed') return `<button class="primary" data-act="next" ${autoplay ? 'disabled' : ''}>Next question</button>`;
  return `<div class="waiting">${room ? `${left} seal${left === 1 ? '' : 's'} to go` : 'Opening a room…'}</div>`;
}

function boardVerdict(): string {
  const res = room?.results;
  if (!res) return `<div class="verdict">Names stay on the phones. The ledger only sees seat pseudonyms and seals.</div>`;
  return res.matched
    ? `<div class="verdict yes">All three picked “${esc(prompt().options[res.choices[0]])}”. Score 1.</div>`
    : `<div class="verdict no">No match this round. Score 0.</div>`;
}

const boardLog = () => log.map((l) => `<div class="log-line ${l.kind}"><span class="mono t">${l.time}</span><span class="mono c">${l.circuit}</span><span class="d">${esc(l.detail)}</span></div>`).join('');

function boardPhases(): string {
  const idx = PHASES.indexOf(room?.phase ?? 'lobby');
  return PHASES.map((p, k) => `<li class="${k < idx ? 'done' : k === idx ? 'now' : ''}">${PHASE_LABEL[p]}</li>`).join('');
}

/** Replace a node's markup only when it changed, so running animations (stamps, flips) are not restarted. */
function patch(sel: string, html: string) {
  const el = $(sel);
  if (el && el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; }
}

function render() {
  const p = promptIndex >= 0 ? prompt() : null;
  patch('#question', p ? esc(p.question) : '');
  patch('#round', `Round ${round}`);
  patch('#streak', streak > 0 ? `${streak} in a row` : best > 0 ? `best run ${best}` : 'no matches yet');
  for (const i of [0, 1, 2]) {
    patch(`#p${i} .phone-top`, phoneTop(i));
    patch(`#p${i} .screen`, phoneScreen(i));
    patch(`#p${i} .note-slot`, phoneNote(i));
  }
  patch('#room-line', `room ${short(room?.id ?? null, 10, 6)} · ${room?.optionCount ?? '–'} options`);
  patch('#phases', boardPhases());
  patch('#rows', boardRows());
  patch('#verdict', boardVerdict());
  patch('#action', boardAction());
  patch('#log-lines', boardLog());
  $('#auto').toggleAttribute('disabled', autoplay || revealing);
}

document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
  if (!el || (el as HTMLButtonElement).disabled) return;
  const i = Number(el.dataset.i);
  switch (el.dataset.act) {
    case 'pick': players[i].pick = Number(el.dataset.k); players[i].note = null; render(); break;
    case 'seal': void seal(i); break;
    case 'change': void tryChange(i); break;
    case 'reveal': void breakSeals(); break;
    case 'next': void newRound(); break;
    case 'auto': void playRound(); break;
  }
});

$('#app').innerHTML = `
  <header class="top">
    <div class="brand"><span class="mark">${sealSvg('5ea1edc0de', 46)}</span><div><h1>Sealed Pick</h1><p>Three players. One question. No talking.</p></div></div>
    <div class="mode"><span class="pulse"></span>Simulator · the compiled Compact circuits run in this tab, no proofs</div>
  </header>
  <section class="prompt">
    <div class="prompt-text">
      <div class="meta"><span id="round"></span><span id="streak"></span></div>
      <h2 id="question"></h2>
      <p class="rule">Everyone seals a pick. When all three seals are on the ledger, they break together. You win if all three picked the same thing.</p>
    </div>
    <button id="auto" class="ghost" data-act="auto">Play a round for me</button>
  </section>
  <main id="table">
    <div class="phones">${[0, 1, 2].map((i) => `<section class="phone" id="p${i}" style="--who:${players[i].color}"><header class="phone-top"></header><div class="screen"></div><div class="note-slot"></div></section>`).join('')}</div>
    <section class="board">
      <header class="board-top"><h2>Public ledger</h2><span class="sub">what everyone, the server included, can read</span></header>
      <div class="mono room-line" id="room-line"></div>
      <ol class="phases" id="phases"></ol>
      <div class="rows" id="rows"></div>
      <div id="verdict"></div>
      <div class="action" id="action"></div>
      <div class="log"><div class="log-title">Contract calls</div><div id="log-lines"></div></div>
    </section>
  </main>
  <footer class="foot">Apache-2.0 · contract <span class="mono">contracts/sealed-pick.compact</span> · the same client API runs on a Midnight network through <span class="mono">@sealed-pick/core/network</span></footer>`;

render();
void newRound().then(() => { if (new URLSearchParams(location.search).has('autoplay')) void playRound(); });
