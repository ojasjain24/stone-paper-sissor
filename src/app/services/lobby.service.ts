import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PlayerService } from './player.service';

const Q_KEY = 'rps_queue_v1';
const MATCH_KEY = 'rps_match_v1';

interface MatchState {
  players: [string, string];
  status: 'idle' | 'active' | 'finished';
}

@Injectable({ providedIn: 'root' })
export class LobbyService {
  private channel: BroadcastChannel | null = null;
  private queueSubject = new BehaviorSubject<string[]>(this.loadQueue());
  queue$ = this.queueSubject.asObservable();
  private matchSubject = new BehaviorSubject<MatchState | null>(
    this.getMatch()
  );
  match$ = this.matchSubject.asObservable();

  constructor(private readonly players: PlayerService) {
    this.channel =
      'BroadcastChannel' in window ? new BroadcastChannel('rps_events') : null;
    window.addEventListener('storage', (e) => {
      if (e.key === Q_KEY) this.queueSubject.next(this.loadQueue());
      if (e.key === MATCH_KEY) this.matchSubject.next(this.getMatch());
    });
    this.channel?.addEventListener('message', (ev: MessageEvent) => {
      if (ev.data?.type === 'queue:update')
        this.queueSubject.next(this.loadQueue());
      if (ev.data?.type === 'match:update')
        this.matchSubject.next(this.getMatch());
    });
  }

  tryStartMatch(a: string, b: string): boolean {
    const current = this.getMatch();

    if (current?.status === 'active') {
      this.enqueue(a);
      return false;
    }

    const match: MatchState = { players: [a, b], status: 'active' };
    localStorage.setItem(MATCH_KEY, JSON.stringify(match));
    this.channel?.postMessage({ type: 'match:update' });
    this.matchSubject.next(match);
    return true;
  }

  getMatch(): MatchState | null {
    const raw = localStorage.getItem(MATCH_KEY);
    return raw ? (JSON.parse(raw) as MatchState) : null;
  }

  finishMatch() {
    const m = this.getMatch();
    if (!m) return;

    localStorage.removeItem(MATCH_KEY);
    this.channel?.postMessage({ type: 'match:update' });
    this.matchSubject.next(null);

    setTimeout(() => {
      this.checkQueueAndPrompt();
    }, 300);
  }

  clearMatch() {
    localStorage.removeItem(MATCH_KEY);
    this.channel?.postMessage({ type: 'match:update' });
    this.matchSubject.next(null);
  }

  forceCheckQueue() {
    this.checkQueueAndPrompt();
  }

  isPlayerInActiveMatch(playerName: string): boolean {
    const match = this.getMatch();
    return match?.status === 'active' && match.players.includes(playerName);
  }

  getPlayerMatch(playerName: string): MatchState | null {
    const match = this.getMatch();
    if (match?.status === 'active' && match.players.includes(playerName)) {
      return match;
    }
    return null;
  }

  refreshMatchState() {
    const match = this.getMatch();
    this.matchSubject.next(match);
  }

  enqueue(name: string) {
    const q = this.loadQueue();
    if (!q.includes(name)) {
      q.push(name);
      this.saveQueue(q);
    } else {
    }
  }

  dequeue(): string | undefined {
    const q = this.loadQueue();
    const x = q.shift();
    this.saveQueue(q);
    return x;
  }

  checkQueueAndPrompt() {
    const match = this.getMatch();

    if (match?.status === 'active') {
      return;
    }

    const q = this.loadQueue();
    if (q.length === 0) {
      return;
    }

    const waitingPlayer = q[0];

    const availablePlayers = Object.values(this.players.snapshot()).filter(
      (p) => p.online && p.name !== waitingPlayer && !q.includes(p.name)
    );

    if (availablePlayers.length > 0) {
      const opponent = availablePlayers[0].name;
      this.dequeue();
      const matchStarted = this.tryStartMatch(waitingPlayer, opponent);
      if (matchStarted) {
      } else {
      }
    } else {
    }
  }

  private loadQueue(): string[] {
    try {
      const raw = localStorage.getItem(Q_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(q: string[]) {
    localStorage.setItem(Q_KEY, JSON.stringify(q));
    this.queueSubject.next([...q]);
    this.channel?.postMessage({ type: 'queue:update' });
  }
}
