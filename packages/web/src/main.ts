// SPDX-License-Identifier: Apache-2.0
// Sealed Pick, browser table. Three player clients share one Simulator, which executes the generated Compact circuits
// in this page. Each "phone" owns one client and its private state; the board beside them shows only what the public
// ledger holds.
import '@fontsource/bricolage-grotesque/400.css';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/800.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './style.css';
import { SealedPickClient, Simulator } from '@sealed-pick/core';
import type { RoomEvent, RoomSnapshot } from '@sealed-pick/core';
import { PROMPTS } from './prompts';
import { emblemSvg, sealSvg } from './seal';

type Player = {
  name: string;
  color: string;
  client: SealedPickClient;
  pick: number | null; //       highlighted on this phone, not sealed yet
  sealed: number | null; //     the choice held in this phone's private state
  busy: boolean;
  refused: string | null; //    what the circuit answered when a modified app tried to swap this seal
  note: string | null; //       an unexpected error from the contract
};
type LogLine = { time: string; circuit: string; detail: string; kind: 'ok' | 'reject' | 'round' };

const REPO = 'https://github.com/luoy16002-svg/sealed-pick';
const sim = new Simulator();
// The page holds all three phones, so it keeps each player's secret too; the "modified app" demo below needs it.
const secrets = [0, 1, 2].map(() => crypto.getRandomValues(new Uint8Array(32)));
const players: Player[] = [
  { name: 'Ama', color: '#e8b14f', client: new SealedPickClient(sim, secrets[0]), pick: null, sealed: null, busy: false, refused: null, note: null },
  { name: 'Lior', color: '#5fb8a2', client: new SealedPickClient(sim, secrets[1]), pick: null, sealed: null, busy: false, refused: null, note: null },
  { name: 'Mei', color: '#86a9e3', client: new SealedPickClient(sim, secrets[2]), pick: null, sealed: null, busy: false, refused: null, note: null },
];
let room: RoomSnapshot | null = null;
let round = 0, streak = 0, best = 0, promptIndex = -1;
let revealing = false, autoplay = false;
let active = 0; // the phone shown on narrow screens, where the table shows one phone at a time
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

const ICON = {
  github: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>',
  play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M5 3.2v9.6c0 .5.55.8.97.53l7.2-4.8a.63.63 0 0 0 0-1.06l-7.2-4.8A.63.63 0 0 0 5 3.2Z"/></svg>',
  swap: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 5h10M10 2.5 12.5 5 10 7.5M13.5 11h-10M6 8.5 3.5 11 6 13.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// ---------------------------------------------------------------------------------------------- ledger events
let logSealed = new Set<number>();
sim.subscribe((ev: RoomEvent) => {
  if (room && ev.room.id !== room.id && ev.type !== 'roomCreated') return;
  room = ev.room;
  const seat = (i: number) => `seat ${i}`;
  if (ev.type === 'roomCreated') push('createRoom', `room ${short(ev.room.id)} · ${ev.room.optionCount} options`);
  if (ev.type === 'playerJoined') push('joinRoom', `${seat(ev.room.joined - 1)} taken${ev.room.joined === 3 ? ' · lobby closed' : ''}`);
  if (ev.type === 'choiceCommitted') {
    const i = ev.room.committed.findIndex((c, k) => c && !logSealed.has(k));
    if (i >= 0) { logSealed.add(i); push('commit', `${seat(i)} · seal ${short(ev.room.commitments[i], 8, 4)}`); }
  }
  if (ev.type === 'roomRevealed' && ev.room.results) push('reveal', `3 openings match 3 seals · score ${ev.room.results.score}`);
  render();
});

function push(circuit: string, detail: string, kind: LogLine['kind'] = 'ok') {
  log.unshift({ time: clock(), circuit, detail, kind });
  log.length = Math.min(log.length, 10);
}

// ---------------------------------------------------------------------------------------------- game actions
async function newRound() {
  revealing = false;
  round += 1;
  let next = Math.floor(Math.random() * PROMPTS.length);
  if (next === promptIndex) next = (next + 1) % PROMPTS.length;
  promptIndex = round === 1 ? 0 : next;
  players.forEach((p) => { p.pick = null; p.sealed = null; p.busy = false; p.refused = null; p.note = null; });
  logSealed = new Set();
  room = null;
  active = 0;
  if (round > 1) push('', `Round ${round} · a new room`, 'round');
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
    p.note = `Could not seal: ${reason(e)}`;
  } finally {
    p.busy = false; render();
  }
}

/**
 * A modified app: it skips SealedPickClient's own checks and hands the circuit a fresh opening with a different choice
 * for a seat that is already sealed, using that player's real secret. The Compact contract must refuse it.
 */
async function tryChange(i: number) {
  const p = players[i];
  if (!room || p.sealed === null) return;
  const other = (p.sealed + 1) % room.optionCount;
  const forged = { secret: secrets[i], openings: { [room.id]: { choice: BigInt(other), nonce: crypto.getRandomValues(new Uint8Array(32)) } }, batches: {} };
  try {
    await sim.execute('commit', room.id, forged, BigInt(i));
    p.note = 'The contract accepted a second commitment. This should never happen.';
  } catch (e) {
    p.refused = reason(e);
    push('commit', `seat ${i} · forged swap refused: ${p.refused}`, 'reject');
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
    players[0].note = `Could not break the seals: ${reason(e)}`;
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
      active = i;
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
const quote = (s: string) => `“${esc(s)}”`;
const nextUnsealed = (i: number) => [1, 2].map((k) => (i + k) % 3).find((k) => room && !room.committed[k]);

/** Buttons that only show on narrow screens, where one phone is visible at a time and the ledger sits below. */
function phoneCta(i: number): string {
  if (!room) return '';
  if (room.phase === 'ready') return `<button class="phone-cta primary" data-act="reveal" ${revealing || autoplay ? 'disabled' : ''}>${revealing ? 'Breaking the seals…' : 'Break the seals'}</button>`;
  if (room.phase === 'revealed') return `<button class="phone-cta primary" data-act="next" ${autoplay ? 'disabled' : ''}>Next question</button>`;
  const k = nextUnsealed(i);
  return k === undefined ? '' : `<button class="phone-cta pass" data-act="seat" data-i="${k}">Pass the phone to ${esc(players[k].name)}</button>`;
}

function phoneScreen(i: number): string {
  const p = players[i];
  if (!room || room.joined <= i) return `<div class="phone-wait"><span class="spinner" aria-hidden="true"></span>Joining the room…</div>`;
  const opts = prompt().options;
  const sealHex = room.commitments[i] ?? '00';
  if (room.phase === 'revealed' && room.results) {
    const res = room.results;
    const c = res.choices[i];
    const others = res.choices.filter((_, k) => k !== i).map((k) => quote(opts[k])).join(' and ');
    return `<div class="letter open ${res.matched ? 'match' : 'miss'}" style="--i:${i}">
      <div class="envelope open">
        <div class="card"><span>Revealed</span><b class="${opts[c].length <= 6 ? 'big' : ''}">${esc(opts[c])}</b>${res.matched ? '<em class="card-match">Match</em>' : ''}</div>
        <div class="pocket"></div>
        <div class="seal-wrap broken"><div class="half l">${sealSvg(sealHex, 92)}</div><div class="half r">${sealSvg(sealHex, 92)}</div></div>
      </div>
      <p class="letter-label">${res.matched ? 'Same pick as the other two.' : `The others picked ${others}.`}</p>
      <div class="private after"><span class="private-tag">What went public</span><span class="private-sub">Only the choice. Its nonce was checked inside the reveal circuit and never written to the ledger. ${esc(p.name)}'s secret stayed on this phone.</span></div>
      ${phoneCta(i)}
    </div>`;
  }
  if (p.sealed !== null || room.committed[i]) {
    const pick = p.sealed !== null ? opts[p.sealed] : '?';
    return `<div class="letter sealed${p.refused ? ' refused' : ''}">
      <div class="envelope"><div class="flap"></div><div class="seal-wrap stamp">${sealSvg(sealHex, 96)}</div>${p.refused ? '<div class="refused-stamp" aria-hidden="true">Refused</div>' : ''}</div>
      <p class="letter-label">Sealed. The ledger holds only this seal.</p>
      <div class="private"><span class="private-tag">Only on ${esc(p.name)}'s phone</span><b>${esc(pick)}</b><span class="private-sub">plus a random 32-byte nonce, in private state</span></div>
      ${p.refused
        ? `<div class="refusal" role="status"><b>The circuit refused the swap</b>A modified app skipped its own checks and sent a second pick for ${esc(p.name)}'s seat. The circuit answered ${quote(p.refused)}. The first seal stays.</div>`
        : `<button class="tamper" data-act="change" data-i="${i}">${ICON.swap}Cheat with a modified app</button>`}
      ${phoneCta(i)}
    </div>`;
  }
  const can = room.phase === 'committing';
  return `<div class="hand">
    <div class="hand-label">Your pick · only you see it</div>
    <div class="options ${opts.length === 2 ? 'two' : ''}">
      ${opts.map((o, k) => `<button class="opt ${p.pick === k ? 'on' : ''}" aria-pressed="${p.pick === k}" data-act="pick" data-i="${i}" data-k="${k}" ${can ? '' : 'disabled'}><span class="opt-text">${esc(o)}</span><span class="tick" aria-hidden="true"></span></button>`).join('')}
    </div>
    <div class="hand-foot">
      <p class="hand-hint">Your choice stays on this phone. The ledger only gets a seal.</p>
      <button class="seal-btn" data-act="seal" data-i="${i}" ${p.pick === null || p.busy || !can ? 'disabled' : ''}>${p.busy ? 'Sealing…' : 'Seal my pick'}</button>
    </div>
  </div>`;
}

function phoneTop(i: number): string {
  const p = players[i];
  const pid = room && room.joined > i ? p.client.playerId(room.id) : null;
  return `<span class="dot"></span><span class="who">${esc(p.name)}</span><span class="pid mono" title="Seat pseudonym on the public ledger"><span class="seat-no">seat ${i} · </span>${short(pid, 4, 4)}</span>`;
}

const phoneNote = (i: number) => (players[i].note ? `<div class="note" role="alert">${esc(players[i].note!)}</div>` : '');

function seatTabs(): string {
  return players.map((p, i) => {
    const sealedNow = !!room && room.committed[i];
    const state = room?.results ? 'revealed' : sealedNow ? 'sealed' : 'picking';
    return `<button class="seat-tab ${i === active ? 'on' : ''}" role="tab" aria-selected="${i === active}" data-act="seat" data-i="${i}" style="--who:${p.color}">
      <span class="dot"></span>${esc(p.name)}${state !== 'picking' ? `<span class="tab-wax ${state}" aria-hidden="true"></span>` : ''}<span class="sr">${state === 'picking' ? '' : `, ${state}`}</span>
    </button>`;
  }).join('');
}

function boardRows(): string {
  return [0, 1, 2].map((i) => {
    const c = room?.commitments[i] ?? null;
    const joined = !!room && room.joined > i;
    const choice = room?.results ? esc(prompt().options[room.results.choices[i]]) : '';
    return `<div class="row ${c ? 'has' : ''} ${choice ? 'shown' : ''}" style="--who:${players[i].color};--i:${i}">
      <span class="dot"></span><span class="mono pseud">${joined ? short(room!.players[i], 6, 4) : 'empty seat'}</span>
      <span class="mono seal-hash">${c ? `<i class="wax-dot"></i>${short(c, 10, 6)}` : joined ? 'no seal yet' : ''}</span>
      <span class="reveal-cell">${choice}</span>
    </div>`;
  }).join('');
}

function boardAction(): string {
  const ph = room?.phase ?? 'lobby';
  const left = room ? 3 - room.committedCount : 3;
  if (ph === 'ready') return `<button class="primary" data-act="reveal" ${revealing || autoplay ? 'disabled' : ''}>${revealing ? 'Breaking the seals…' : 'Break the seals'}</button>`;
  if (ph === 'revealed') return `<button class="primary" data-act="next" ${autoplay ? 'disabled' : ''}>Next question</button>`;
  return `<div class="waiting">${room && ph === 'committing' ? `${left} seal${left === 1 ? '' : 's'} to go` : 'Opening a room…'}</div>`;
}

function boardVerdict(): string {
  const res = room?.results;
  if (!res) {
    return room?.phase === 'ready'
      ? `<p class="verdict">All three seals are in, and nobody has seen a pick yet.</p>`
      : `<p class="verdict">Names stay on the phones. The ledger only sees seat pseudonyms and seals.</p>`;
  }
  return res.matched
    ? `<p class="verdict yes"><span class="badge">Match</span>All three picked ${quote(prompt().options[res.choices[0]])}. Score 1.</p>`
    : `<p class="verdict no">No match this round. Score 0.</p>`;
}

const boardLog = () => log.map((l) => (l.kind === 'round'
  ? `<div class="log-round"><span>${esc(l.detail)}</span></div>`
  : `<div class="log-line ${l.kind}"><span class="mono c">${l.circuit}</span><span class="d">${esc(l.detail)}</span><span class="mono t">${l.time}</span></div>`)).join('');

function boardPhases(): string {
  const idx = PHASES.indexOf(room?.phase ?? 'lobby');
  return PHASES.map((p, k) => `<li class="${k < idx ? 'done' : k === idx ? 'now' : ''}" ${k === idx ? 'aria-current="step"' : ''}>${PHASE_LABEL[p]}</li>`).join('');
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
  $('#streak').classList.toggle('hot', streak > 0);
  patch('#seat-tabs', seatTabs());
  for (const i of [0, 1, 2]) {
    patch(`#p${i} .phone-top`, phoneTop(i));
    patch(`#p${i} .screen`, phoneScreen(i));
    patch(`#p${i} .note-slot`, phoneNote(i));
    $(`#p${i}`).classList.toggle('active', i === active);
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
    case 'seat': active = i; render(); $('#seat-tabs').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); break;
  }
});

$('#app').innerHTML = `
  <header class="top">
    <div class="brand">
      <span class="mark">${emblemSvg(48, 'brand-emblem')}</span>
      <div><h1>Sealed Pick</h1><p>Three players. One question. No talking.</p></div>
    </div>
    <div class="top-right">
      <div class="mode" title="The compiled Compact circuits run in this tab. No proofs are generated here; the devnet run in the repository does that."><span class="pulse"></span><b>Simulator</b><span class="mode-sub">the compiled Compact circuits run in this tab, no proofs</span></div>
      <a class="gh" href="${REPO}" target="_blank" rel="noopener">${ICON.github}<span>Source</span></a>
    </div>
  </header>
  <section class="prompt">
    <div class="prompt-text">
      <div class="meta"><span id="round"></span><span id="streak"></span></div>
      <h2 id="question"></h2>
      <p class="rule">Everyone seals a pick. When all three seals are on the ledger, they break together. You win if all three picked the same thing.</p>
      <p class="mode-line"><span class="pulse"></span>Simulator: the compiled Compact circuits run in this tab, without proofs.</p>
    </div>
    <button id="auto" class="ghost" data-act="auto">${ICON.play}Play a round for me</button>
  </section>
  <main id="table">
    <div class="phones-wrap">
      <div class="seat-tabs" id="seat-tabs" role="tablist" aria-label="Whose phone to show"></div>
      <div class="phones">${players.map((p, i) => `<section class="phone" id="p${i}" style="--who:${p.color}" aria-label="${p.name}'s phone"><header class="phone-top"></header><div class="screen"></div><div class="note-slot"></div></section>`).join('')}</div>
    </div>
    <section class="board" aria-label="Public ledger">
      <div class="board-main">
        <header class="board-top"><h2>Public ledger</h2><span class="sub">What everyone can read, the server included</span></header>
        <div class="mono room-line" id="room-line"></div>
        <ol class="phases" id="phases"></ol>
        <div class="rows" id="rows"></div>
        <div id="verdict" aria-live="polite"></div>
        <div class="action" id="action"></div>
      </div>
      <div class="log"><div class="log-title">Contract calls</div><div id="log-lines"></div></div>
    </section>
  </main>
  <footer class="foot">
    <span>Apache-2.0</span>
    <span>Contract: <a href="${REPO}/blob/master/contracts/sealed-pick.compact" target="_blank" rel="noopener">sealed-pick.compact</a></span>
    <span>The same client API runs on a Midnight network through <code>@sealed-pick/core/network</code></span>
    <a href="${REPO}#readme" target="_blank" rel="noopener">How it works</a>
  </footer>`;

render();
void newRound().then(() => { if (new URLSearchParams(location.search).has('autoplay')) void playRound(); });
