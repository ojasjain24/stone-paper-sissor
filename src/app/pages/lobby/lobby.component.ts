import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PlayerService } from '../../services/player.service';
import { LobbyService } from '../../services/lobby.service';
import { LeaderboardComponent } from '../leaderboard/leaderboard.component';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, LeaderboardComponent],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
})
export class LobbyComponent implements OnDestroy {
  private router = inject(Router);
  private playerService = inject(PlayerService);
  private lobbyService = inject(LobbyService);

  me = '';
  onlinePlayers: any[] = [];
  upcomingMatches: any[] = [];
  private subscription: any;

  constructor() {
    this.loadPlayers();
    this.loadUpcomingMatches();
    this.checkForMatches();
  }

  private loadPlayers() {
    this.subscription = this.playerService.players$.subscribe((players) => {
      this.me = this.playerService.getCurrentUser();
      this.onlinePlayers = Object.values(players)
        .filter((p: any) => p.online)
        .sort((a: any, b: any) => b.score - a.score);
    });
  }

  private loadUpcomingMatches() {
    this.lobbyService.upcomingMatches$.subscribe((matches) => {
      this.upcomingMatches = matches.filter(
        (match) => match.status === 'pending'
      );
    });
  }

  private checkForMatches() {
    this.lobbyService.match$.subscribe((match) => {
      if (!match || match.status !== 'active' || !this.me) return;

      if (match.players.includes(this.me)) {
        this.router.navigateByUrl('/game');
      }
    });
  }

  challenge(opponent: string) {
    if (!this.me || this.me === opponent) return;

    const matchId = this.lobbyService.createUpcomingMatch(this.me, opponent);

    if (matchId) {
      // Auto-start the match if both players are online
      const matchStarted = this.lobbyService.tryStartMatch(matchId);
      if (matchStarted) {
        this.router.navigateByUrl('/game');
      }
    }
  }

  cancelMatch(matchId: string) {
    this.lobbyService.cancelUpcomingMatch(matchId);
  }

  isMyMatch(match: any): boolean {
    return match.players.includes(this.me);
  }

  getMatchTime(createdAt: number): string {
    const now = Date.now();
    const diff = now - createdAt;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  }

  logout() {
    this.playerService.logout();
    this.router.navigateByUrl('/login');
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
