# Files Changed - Session Summary

This document lists all files that were modified during this coding session. Use this for your GitHub deployment.

---

## 1. Cerebras Models Integration

### Edge Function (needs redeployment to Supabase)
- `supabase/functions/chat/index.ts` - Added Cerebras API routing

### Frontend
- `src/components/chat/CharacterEditDialog.tsx` - Added GLM 4.6 & Qwen3 235b to model selector

---

## 2. Group Settings - Model Per Character

### Database Migration (run in Supabase SQL Editor)
- `supabase/migrations/add_group_model_override.sql` - NEW FILE

### TypeScript Types
- `src/integrations/supabase/types.ts` - Added `model_override` to group_members, `reactions` to group_messages

### Hooks
- `src/hooks/useGroups.ts` - Added `useUpdateMemberModel` hook

### UI Components
- `src/components/chat/GroupProfileSheet.tsx` - Added model dropdown per member
- `src/components/chat/GroupChatWindow.tsx` - Model override support + Reaction UI

---

## 3. Group Chat Reactions

### Database Migration (run in Supabase SQL Editor)
- `supabase/migrations/add_group_message_reactions.sql` - NEW FILE

### Hooks
- `src/hooks/useGroupMessages.ts` - Added `useReactToGroupMessage` hook

### UI Components
- `src/components/chat/GroupChatWindow.tsx` - Reaction emoji picker and display

---

## 4. Deployment Files

### Vite Config
- `vite.config.ts` - Added `allowedHosts: true` for Render deployment

### Workflows
- `.agent/workflows/deploy_to_render.md` - Deployment guide

---

## Complete File List (Copy/Paste for git add)

```bash
git add vite.config.ts
git add supabase/functions/chat/index.ts
git add src/components/chat/CharacterEditDialog.tsx
git add src/integrations/supabase/types.ts
git add src/hooks/useGroups.ts
git add src/hooks/useGroupMessages.ts
git add src/components/chat/GroupProfileSheet.tsx
git add src/components/chat/GroupChatWindow.tsx
git add supabase/migrations/add_group_model_override.sql
git add supabase/migrations/add_group_message_reactions.sql
```

---

## Database Migrations to Run

Run these in Supabase SQL Editor:

```sql
-- Group model override
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS model_override TEXT DEFAULT NULL;

-- Group message reactions
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}';
```

---

## Environment Variables Required

In Supabase Edge Functions → Manage Secrets:
- `CEREBRAS_API_KEY` - Your Cerebras API key
