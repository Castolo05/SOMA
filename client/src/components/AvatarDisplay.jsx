import { UserRound, Cat, Dog, Rabbit, Bird, Snail, Turtle, Fish, Rat } from 'lucide-react'

// Mapeo de animalitos para el avatar
export const ANIMAL_ICONS = {
  Cat, Dog, Rabbit, Bird, Snail, Turtle, Fish, Rat
}

// Componente para renderizar el avatar
export default function AvatarDisplay({ avatar, size = 28, className = "" }) {
  if (!avatar) return <UserRound size={size} className={className} />
  if (avatar.startsWith('data:image') || avatar.startsWith('http')) {
    return <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
  }
  if (avatar.startsWith('icon:')) {
    const iconName = avatar.split(':')[1]
    const IconComp = ANIMAL_ICONS[iconName] || UserRound
    return <IconComp size={size} className={className} />
  }
  return <UserRound size={size} className={className} />
}
