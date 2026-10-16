// The same avatar sprite sheets the offer posters use (2x2 people per sheet).
import sheet1 from '@/assets/offer-avatars/avatars-01-v2.png';
import sheet2 from '@/assets/offer-avatars/avatars-02-v2.png';
import sheet3 from '@/assets/offer-avatars/avatars-03-v2.png';
import sheet4 from '@/assets/offer-avatars/avatars-04-v2.png';
import sheet5 from '@/assets/offer-avatars/avatars-05-v2.png';

const SHEETS = { 1: sheet1, 2: sheet2, 3: sheet3, 4: sheet4, 5: sheet5 } as const;

interface PersonSpriteProps {
  sheet: keyof typeof SHEETS;
  // 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right
  slot: 0 | 1 | 2 | 3;
  className?: string;
}

export const PersonSprite = ({ sheet, slot, className }: PersonSpriteProps) => (
  <div
    aria-hidden="true"
    className={className}
    style={{
      backgroundImage: `url(${SHEETS[sheet]})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '200% 200%',
      backgroundPosition: `${slot % 2 ? '100%' : '0'} ${slot >= 2 ? '100%' : '0'}`,
    }}
  />
);
