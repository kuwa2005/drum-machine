import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** 本番公開先: https://lil.la/drum-machine/ */
const PRODUCTION_BASE = '/drum-machine/'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [tailwindcss(), react()],
  /** 本番は絶対パス base（末尾スラッシュ付き）。末尾スラッシュ無し URL でもアセットがズレにくい */
  base: mode === 'production' ? PRODUCTION_BASE : '/',
  build: {
    /** 成果物フォルダ名（dist ではなく drum-machine） */
    outDir: 'drum-machine',
    emptyOutDir: true,
  },
}))
