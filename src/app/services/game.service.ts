import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PlayerService } from './player.service';

type Choice = 'rock' | 'paper' | 'scissors' | '';

interface RoundState {
  a: string;
  b: string;
  choiceA: Choice;
  choiceB: Choice;
  result: 'a' | 'b' | 'draw' | '';
}

const ROUND_KEY = 'rps_round_v1';

@Injectable({ providedIn: 'root' })
export class GameService {
  private channel: BroadcastChannel | null = null;
  private roundSubject = new BehaviorSubject<RoundState | null>(this.load());
  round$ = this.roundSubject.asObservable();

  constructor(private readonly players: PlayerService) {
    this.channel =
      'BroadcastChannel' in window ? new BroadcastChannel('rps_events') : null;
    window.addEventListener('storage', (e) => {
      if (e.key === ROUND_KEY) this.roundSubject.next(this.load());
    });
    this.channel?.addEventListener('message', (ev: MessageEvent) => {
      if (ev.data?.type === 'round:update') this.roundSubject.next(this.load());
    });
  }

  init(a: string, b: string) {
    const r: RoundState = { a, b, choiceA: '', choiceB: '', result: '' };
    this.save(r);
  }

  choose(me: string, c: Choice) {
    const r = this.load();
    if (!r) return;
    if (me === r.a) r.choiceA = c;
    if (me === r.b) r.choiceB = c;
    this.compute(r);
    this.save(r);
  }

  reset() {
    const r = this.load();
    if (!r) return;
    const next: RoundState = {
      a: r.a,
      b: r.b,
      choiceA: '',
      choiceB: '',
      result: '',
    };
    this.save(next);
  }

  private compute(r: RoundState) {
    if (r.choiceA && r.choiceB) {
      const outcome = this.winner(r.choiceA, r.choiceB);
      r.result = outcome;
      if (outcome === 'a') this.players.addScore(r.a, 1);
      if (outcome === 'b') this.players.addScore(r.b, 1);
    }
  }

  private winner(a: Choice, b: Choice): 'a' | 'b' | 'draw' {
    if (a === b) return 'draw';
    if (
      (a === 'rock' && b === 'scissors') ||
      (a === 'scissors' && b === 'paper') ||
      (a === 'paper' && b === 'rock')
    )
      return 'a';
    return 'b';
  }

  private load(): RoundState | null {
    const raw = localStorage.getItem(ROUND_KEY);
    return raw ? (JSON.parse(raw) as RoundState) : null;
  }

  private save(r: RoundState) {
    localStorage.setItem(ROUND_KEY, JSON.stringify(r));
    this.roundSubject.next({ ...r });
    this.channel?.postMessage({ type: 'round:update' });
  }
}
