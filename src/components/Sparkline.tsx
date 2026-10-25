import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { sampleWeight } from '../data'

export function Sparkline() {
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sampleWeight} margin={{ top: 8, right: 0, bottom: 0, left: -24 }}><defs><linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c9f36a" stopOpacity={0.28} /><stop offset="100%" stopColor="#c9f36a" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#78817b', fontSize: 10 }} /><YAxis hide domain={['dataMin - 0.3', 'dataMax + 0.3']} /><Tooltip contentStyle={{ background: '#181e1b', border: '1px solid #2e3932', borderRadius: 12, color: '#eef4ed' }} formatter={(value) => [`${value} kg`, 'Weight']} /><Area type="monotone" dataKey="weight" stroke="#c9f36a" strokeWidth={2} fill="url(#weight-fill)" /></AreaChart></ResponsiveContainer></div>
}
