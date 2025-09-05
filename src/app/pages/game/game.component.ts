import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LobbyService } from '../../services/lobby.service';
import { GameService } from '../../services/game.service';
import { PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
})
export class GameComponent {
  private router = inject(Router);
  private lobbyService = inject(LobbyService);
  private gameService = inject(GameService);
  private playerService = inject(PlayerService);

  a = '';
  b = '';
  me = '';
  state: any;
  ready = false;

  constructor() {
    this.initializeGame();
    this.setupGameState();
    this.setupMatchListener();
  }

  private initializeGame() {
    const match = this.lobbyService.getMatch();
    const currentUser = this.playerService.getCurrentUser();

    if (!match || match.status !== 'active' || !currentUser) {
      this.router.navigateByUrl('/lobby');
      return;
    }

    this.a = match.players[0];
    this.b = match.players[1];
    this.me = currentUser;
    this.ready = true;

    localStorage.removeItem('rps_round_v1');
    this.gameService.init(this.a, this.b);
  }

  private setupGameState() {
    this.gameService.round$.subscribe((round) => {
      this.state = round;
    });
  }

  private setupMatchListener() {
    this.lobbyService.match$.subscribe((match) => {
      if (!match || match.status !== 'active') {
        this.router.navigateByUrl('/lobby');
        return;
      }

      if (match.players.includes(this.me)) {
        if (match.players[0] !== this.a || match.players[1] !== this.b) {
          this.router.navigateByUrl('/lobby');
        }
      }
    });
  }

  pick(choice: 'rock' | 'paper' | 'scissors') {
    this.gameService.choose(this.me, choice);
  }

  getPlayerChoice(player: 'a' | 'b') {
    if (!this.state) return '?';

    const isRevealed = !!this.state.result;
    const isMyPlayer = this.me === (player === 'a' ? this.a : this.b);
    const choice = player === 'a' ? this.state.choiceA : this.state.choiceB;

    if (isRevealed || isMyPlayer) {
      return choice || '?';
    }

    return '?';
  }

  isGameFinished() {
    return !!this.state?.result;
  }

  isWinner() {
    if (!this.state?.result) return false;
    const myPlayer = this.me === this.a ? 'a' : 'b';
    return this.state.result === myPlayer;
  }

  isLoser() {
    if (!this.state?.result) return false;
    const myPlayer = this.me === this.a ? 'a' : 'b';
    return this.state.result !== myPlayer && this.state.result !== 'draw';
  }

  isDraw() {
    return this.state?.result === 'draw';
  }

  getResultMessage() {
    if (!this.state?.result) return '';

    if (this.state.result === 'draw') {
      return "It's a Draw! 🤝";
    }

    if (this.isWinner()) {
      return 'You Win! 🎉';
    }

    return 'You Lose! 😔';
  }

  playAgain() {
    localStorage.removeItem('rps_round_v1');
    this.gameService.init(this.a, this.b);
  }

  backToLobby() {
    this.lobbyService.finishMatch();
    this.router.navigateByUrl('/lobby');
  }

  logout() {
    this.lobbyService.finishMatch();
    this.playerService.logout();
    this.router.navigateByUrl('/login');
  }
}
