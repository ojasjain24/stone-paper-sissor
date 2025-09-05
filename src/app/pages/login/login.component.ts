import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private router = inject(Router);
  private playerService = inject(PlayerService);

  username = '';
  error = '';

  onSubmit() {
    this.error = '';

    const success = this.playerService.register(this.username.trim());

    if (!success) {
      this.error = 'Username already taken. Choose another.';
      return;
    }

    this.router.navigateByUrl('/lobby');
  }
}
