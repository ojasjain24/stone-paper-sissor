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
  queue: string[] = [];
  private subscription: any;

  constructor() {
    this.loadPlayers();
    this.loadQueue();
    this.checkForMatches();
    this.lobbyService.checkQueueAndPrompt();
  }

  private loadPlayers() {
    this.subscription = this.playerService.players$.subscribe((players) => {
      this.me = this.playerService.getCurrentUser();
      this.onlinePlayers = Object.values(players)
        .filter((p: any) => p.online)
        .sort((a: any, b: any) => b.score - a.score);
    });
  }

  private loadQueue() {
    this.lobbyService.queue$.subscribe((queue) => {
      this.queue = queue;
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

    const matchStarted = this.lobbyService.tryStartMatch(this.me, opponent);

    if (matchStarted) {
      this.router.navigateByUrl('/game');
    }
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
