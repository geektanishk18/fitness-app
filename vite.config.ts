import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const supabaseEnv = loadEnv(mode, process.cwd(), ['VITE_SUPABASE_', 'NEXT_PUBLIC_SUPABASE_'])
  return {
    plugins: [react()],
    define: {
      __VT_SUPABASE_URL__: JSON.stringify(supabaseEnv.NEXT_PUBLIC_SUPABASE_URL || supabaseEnv.VITE_SUPABASE_URL || ''),
      __VT_SUPABASE_PUBLIC_KEY__: JSON.stringify(supabaseEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || supabaseEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseEnv.VITE_SUPABASE_ANON_KEY || ''),
    },
    build: {
      target: 'es2022',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('@supabase')) return 'supabase-vendor'
            if (id.includes('recharts') || id.includes('/d3-')) return 'charts-vendor'
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react-vendor'
            if (id.includes('lucide-react')) return 'icons-vendor'
          },
        },
      },
    },
  }
})
