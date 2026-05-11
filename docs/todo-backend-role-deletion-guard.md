# TODO: Impedire cancellazione ruolo se assegnato a utenti

Attualmente la cancellazione di un ruolo ha cascade — va modificato il comportamento.

## Regola

Un ruolo custom non deve poter essere cancellato se almeno un utente lo possiede.

## Fix da fare

In `rms-backend/src/roles/roles.service.ts`, prima di `this.roleRepository.delete(id)`:

```typescript
const usersWithRole = await this.userRepository.count({
  where: { roles: { id } },
  relations: ['roles'],
})
if (usersWithRole > 0) {
  throw new ConflictException(`Cannot delete role: ${usersWithRole} user(s) still assigned`)
}
```

Rimuovere il cascade dalla relazione `Role → User` (o lasciarlo e bloccare a livello di service).
