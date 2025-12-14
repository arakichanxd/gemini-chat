-- Add voice settings columns to characters table
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS voice_name TEXT NOT NULL DEFAULT 'Kore';

-- Available voices:
-- Female: Kore, Aoede, Leda, Zephyr, Callirrhoe, Autonoe, Despina, Erinome, Laomedeia
-- Male: Puck, Charon, Fenrir, Orus, Enceladus, Iapetus, Umbriel, Algieba, Algenib, Rasalgethi, Achernar, Alnilam
