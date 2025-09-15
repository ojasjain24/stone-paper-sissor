import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface Player {
  name: string;
  score: number;
  online: boolean;
  lastSeen: number;
}

const STORAGE_KEY = 'rps_players_v1';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private playersSubject = new BehaviorSubject<Player[]>([]);
  players$ = this.playersSubject.asObservable();
  private currentUserSubject = new BehaviorSubject<string>('');
  currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.loadFromStorage();
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        this.loadFromStorage();
      }
    });
    window.addEventListener('beforeunload', () => {
      const me = this.currentUserSubject.value;
      if (me) {
        this.setOnline(me, false);
      }
    });
  }

  register(name: string): boolean {
    if (!name) return false;
    const players = this.snapshot();
    const existingPlayer = players.find((p) => p.name === name);

    if (existingPlayer?.online) return false;

    if (existingPlayer) {
      existingPlayer.online = true;
      existingPlayer.lastSeen = Date.now();
    } else {
      players.push({
        name,
        score: 0,
        online: true,
        lastSeen: Date.now(),
      });
    }

    this.save(players);
    this.currentUserSubject.next(name);
    return true;
  }

  setOnline(name: string, online: boolean) {
    const players = this.snapshot();
    const player = players.find((p) => p.name === name);
    if (!player) return;

    player.online = online;
    player.lastSeen = Date.now();
    this.save(players);
  }

  addScore(name: string, delta: number) {
    const players = this.snapshot();
    const player = players.find((p) => p.name === name);
    if (!player) return;

    player.score += delta;
    player.lastSeen = Date.now();
    this.save(players);
  }

  getCurrentUser(): string {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    const currentUser = this.getCurrentUser();
    return !!currentUser && currentUser.trim() !== '';
  }

  logout(): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      this.setOnline(currentUser, false);
      this.currentUserSubject.next('');
    }
  }

  snapshot(): Player[] {
    return [...this.playersSubject.value];
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const players = raw ? (JSON.parse(raw) as Player[]) : [];
      this.playersSubject.next(players);
    } catch {
      this.playersSubject.next([]);
    }
  }

  private save(players: Player[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
    this.playersSubject.next([...players]);
  }
}
