# TODO: Backend validation for role name format

Il frontend normalizza il nome ruolo live (watch Vue): `.toUpperCase()` + `.replace(/\s+/g, '_')`.

La BE non ha ancora una validazione corrispondente — accetta qualsiasi stringa come nome ruolo.

## Fix da fare

In `rms-backend/src/roles/dto/create-role.dto.ts` e `update-role.dto.ts`, aggiungere:

```typescript
import { Matches } from 'class-validator';

@Matches(/^[A-Z0-9_]+$/, { message: 'Role name must be uppercase letters, digits and underscores only' })
name: string;
```
