import { useState } from 'react';
import { CharacterSelect } from '@/components/engine/CharacterSelect';
import { GrudgeScene } from '@/components/engine/GrudgeScene';
import { type CharacterSelection } from '@/lib/grudge-characters';

type PageState = 'select' | 'game';

export default function GrudgePage() {
  const [state, setState] = useState<PageState>('select');
  const [selection, setSelection] = useState<CharacterSelection | null>(null);

  const handleEnterWorld = (sel: CharacterSelection) => {
    setSelection(sel);
    setState('game');
  };

  const handleBack = () => setState('select');

  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-950">
      {state === 'select' && (
        <CharacterSelect onEnterWorld={handleEnterWorld} />
      )}
      {state === 'game' && selection && (
        <GrudgeScene selection={selection} onBack={handleBack} />
      )}
    </div>
  );
}
