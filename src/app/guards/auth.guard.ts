import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { PlayerService } from '../services/player.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private readonly playerService = inject(PlayerService);
  private readonly router = inject(Router);

  canActivate(): boolean {
    if (!this.playerService.isLoggedIn()) {
      this.router.navigateByUrl('/login');
      return false;
    }
    return true;
  }
}
