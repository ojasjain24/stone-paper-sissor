import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'lobby',
    loadComponent: () =>
      import('./pages/lobby/lobby.component').then((m) => m.LobbyComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'game',
    loadComponent: () =>
      import('./pages/game/game.component').then((m) => m.GameComponent),
    canActivate: [AuthGuard],
  },

  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
