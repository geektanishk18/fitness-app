import { Bell, Search } from 'lucide-react'
import { BrandMark } from './BrandMark'

export function TopBar() { return <header className="topbar"><BrandMark /><div className="topbar-context"><span className="eyebrow">Saturday, 25 October</span><strong>V-Taper / <em>Focus mode</em></strong></div><div className="topbar-actions"><button className="icon-button" aria-label="Search"><Search size={18} /></button><button className="icon-button notification" aria-label="Notifications"><Bell size={18} /><i /></button><div className="avatar">AS</div></div></header> }
