import { BarChart3, Dumbbell, LayoutDashboard, Settings, Utensils } from 'lucide-react'
import type { NavKey } from '../types'

const items: { key: NavKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Today', icon: LayoutDashboard }, { key: 'workout', label: 'Train', icon: Dumbbell }, { key: 'progress', label: 'Progress', icon: BarChart3 }, { key: 'nutrition', label: 'Fuel', icon: Utensils }, { key: 'settings', label: 'Profile', icon: Settings },
]

export function BottomNav({ active, onChange }: { active: NavKey; onChange: (key: NavKey) => void }) {
  return <nav className="bottom-nav" aria-label="Primary navigation">{items.map(({ key, label, icon: Icon }) => <button key={key} className={active === key ? 'nav-item active' : 'nav-item'} onClick={() => onChange(key)} aria-current={active === key ? 'page' : undefined}><Icon size={18} strokeWidth={active === key ? 2.2 : 1.7} /><span>{label}</span></button>)}</nav>
}
