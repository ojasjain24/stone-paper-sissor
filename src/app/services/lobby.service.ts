import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PlayerService } from './player.service';

const UPCOMING_MATCHES_KEY = 'rps_upcoming_matches_v1';
const MATCH_KEY = 'rps_match_v1';

interface MatchState {
  players: [string, string];
  status: 'idle' | 'active' | 'finished';
}

interface UpcomingMatch {
  id: string;
  players: [string, string];
  createdAt: number;
  status: 'pending' | 'ready' | 'cancelled';
}

@Injectable({ providedIn: 'root' })
export class LobbyService {
  private channel: BroadcastChannel | null = null;
  private upcomingMatchesSubject = new BehaviorSubject<UpcomingMatch[]>(
    this.loadUpcomingMatches()
  );
  upcomingMatches$ = this.upcomingMatchesSubject.asObservable();
  private matchSubject = new BehaviorSubject<MatchState | null>(
    this.getMatch()
  );
  match$ = this.matchSubject.asObservable();

  constructor(private readonly players: PlayerService) {
    this.channel =
      'BroadcastChannel' in window ? new BroadcastChannel('rps_events') : null;
    window.addEventListener('storage', (e) => {
      if (e.key === UPCOMING_MATCHES_KEY)
        this.upcomingMatchesSubject.next(this.loadUpcomingMatches());
      if (e.key === MATCH_KEY) this.matchSubject.next(this.getMatch());
    });
    this.channel?.addEventListener('message', (ev: MessageEvent) => {
      if (ev.data?.type === 'upcoming:update')
        this.upcomingMatchesSubject.next(this.loadUpcomingMatches());
      if (ev.data?.type === 'match:update')
        this.matchSubject.next(this.getMatch());
    });
  }

  createUpcomingMatch(player1: string, player2: string): string | null {
    if (!player1 || !player2 || player1 === player2) return null;

    const upcomingMatches = this.loadUpcomingMatches();

    // Check if there's already a pending match between these players
    const existingMatch = upcomingMatches.find(
      (match) =>
        ((match.players[0] === player1 && match.players[1] === player2) ||
          (match.players[0] === player2 && match.players[1] === player1)) &&
        match.status === 'pending'
    );

    if (existingMatch) {
      alert('Match already exists! please complete the existing match first');
      return null; // Don't create a new match if one already exists
    }

    const matchId = this.generateMatchId();

    const upcomingMatch: UpcomingMatch = {
      id: matchId,
      players: [player1, player2],
      createdAt: Date.now(),
      status: 'pending',
    };

    upcomingMatches.push(upcomingMatch);
    this.saveUpcomingMatches(upcomingMatches);
    return matchId;
  }

  tryStartMatch(matchId: string): boolean {
    const current = this.getMatch();
    if (current?.status === 'active') {
      return false;
    }

    const upcomingMatches = this.loadUpcomingMatches();
    const upcomingMatch = upcomingMatches.find((m) => m.id === matchId);

    if (!upcomingMatch || upcomingMatch.status !== 'pending') {
      return false;
    }

    // Mark as ready and start the match
    upcomingMatch.status = 'ready';
    this.saveUpcomingMatches(upcomingMatches);

    const match: MatchState = {
      players: upcomingMatch.players,
      status: 'active',
    };
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
      this.startNextUpcomingMatch();
    }, 300);
  }

  clearMatch() {
    localStorage.removeItem(MATCH_KEY);
    this.channel?.postMessage({ type: 'match:update' });
    this.matchSubject.next(null);
  }

  startNextUpcomingMatch() {
    const match = this.getMatch();
    if (match?.status === 'active') {
      return;
    }

    const upcomingMatches = this.loadUpcomingMatches();
    const nextMatch = upcomingMatches.find((m) => m.status === 'pending');

    if (nextMatch) {
      this.tryStartMatch(nextMatch.id);
    }
  }

  cancelUpcomingMatch(matchId: string): boolean {
    const upcomingMatches = this.loadUpcomingMatches();
    const matchIndex = upcomingMatches.findIndex((m) => m.id === matchId);

    if (matchIndex === -1) return false;

    upcomingMatches[matchIndex].status = 'cancelled';
    this.saveUpcomingMatches(upcomingMatches);
    return true;
  }

  getUpcomingMatchesForPlayer(playerName: string): UpcomingMatch[] {
    const upcomingMatches = this.loadUpcomingMatches();
    return upcomingMatches.filter(
      (m) => m.players.includes(playerName) && m.status === 'pending'
    );
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

  private generateMatchId(): string {
    return (
      'match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    );
  }

  private loadUpcomingMatches(): UpcomingMatch[] {
    try {
      const raw = localStorage.getItem(UPCOMING_MATCHES_KEY);
      return raw ? (JSON.parse(raw) as UpcomingMatch[]) : [];
    } catch {
      return [];
    }
  }

  private saveUpcomingMatches(matches: UpcomingMatch[]) {
    // Clean up old matches (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const cleanedMatches = matches.filter(
      (match) => match.status !== 'cancelled' && match.createdAt > oneHourAgo
    );

    localStorage.setItem(UPCOMING_MATCHES_KEY, JSON.stringify(cleanedMatches));
    this.upcomingMatchesSubject.next([...cleanedMatches]);
    this.channel?.postMessage({ type: 'upcoming:update' });
  }
}
