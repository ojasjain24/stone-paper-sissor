import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.scss'],
})
export class LeaderboardComponent {
  private playerService = inject(PlayerService);

  players: any[] = [];
  currentUser: string | null = null;

  constructor() {
    this.loadPlayers();
    this.getCurrentUser();
  }

  private loadPlayers() {
    this.playerService.players$.subscribe((playersMap) => {
      this.players = Object.values(playersMap).sort(
        (a: any, b: any) => b.score - a.score
      );
    });
  }

  private getCurrentUser() {
    this.currentUser = localStorage.getItem('rps_player_name');
  }
}
