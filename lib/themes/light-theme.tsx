/**
 * Global Light Theme Configuration
 * Session 14 - April 16, 2026
 * 
 * This module ensures light theme is applied globally across the app
 */

import { createContext, useContext, useEffect, ReactNode } from 'react'

interface ThemeContextType {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Force light theme globally
    const html = document.documentElement
    
    // Remove any dark theme classes
    html.classList.remove('dark')
    html.style.colorScheme = 'light'
    
    // Set light theme attributes
    localStorage.setItem('theme', 'light')
    
    // Apply light theme to all elements
    document.body.style.backgroundColor = '#ffffff'
    document.body.style.color = '#000000'
    
    console.log('✓ Light theme enforced globally')
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: 'light', setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Global light theme CSS
 * Apply to all components and pages
 */
export const lightThemeStyles = `
  :root {
    /* Light theme colors */
    --background: 255 255 255;
    --foreground: 0 0 0;
    --primary: 99 102 241;
    --primary-foreground: 255 255 255;
    --secondary: 148 163 244;
    --secondary-foreground: 255 255 255;
    --destructive: 239 68 68;
    --destructive-foreground: 255 255 255;
    --muted: 229 231 235;
    --muted-foreground: 107 114 128;
    --accent: 248 113 113;
    --accent-foreground: 255 255 255;
    --popover: 255 255 255;
    --popover-foreground: 0 0 0;
    --card: 255 255 255;
    --card-foreground: 0 0 0;
    --border: 229 231 235;
    --input: 229 231 235;
    --ring: 99 102 241;
  }

  * {
    @apply bg-white text-black;
  }

  html, body {
    background-color: #ffffff !important;
    color: #000000 !important;
    color-scheme: light !important;
  }

  .dark, [data-theme="dark"] {
    display: none !important;
  }

  /* Light theme for all components */
  .bg-slate-50 { @apply bg-gray-50 !important; }
  .bg-slate-100 { @apply bg-gray-100 !important; }
  .bg-slate-200 { @apply bg-gray-200 !important; }
  .bg-slate-900 { @apply bg-gray-900 text-white !important; }
  
  .text-slate-900 { @apply text-gray-900 !important; }
  .text-slate-700 { @apply text-gray-700 !important; }
  .text-slate-500 { @apply text-gray-500 !important; }

  /* Ensure all backgrounds are light */
  [class*="bg-"] {
    background-color: inherit !important;
  }

  /* Light theme for cards, modals, dropdowns */
  .card, [role="dialog"], .modal, .dropdown {
    background-color: #ffffff !important;
    color: #000000 !important;
  }

  /* Light borders */
  .border, [class*="border"] {
    border-color: #e5e7eb !important;
  }

  /* Light inputs */
  input, textarea, select {
    background-color: #ffffff !important;
    color: #000000 !important;
    border-color: #e5e7eb !important;
  }

  input::placeholder {
    color: #9ca3af;
  }

  /* Light buttons */
  button {
    transition: all 0.2s;
  }

  button:hover {
    opacity: 0.9;
  }

  /* Light tables */
  table {
    background-color: #ffffff;
    color: #000000;
  }

  th, td {
    border-color: #e5e7eb !important;
  }

  /* Navigation light theme */
  nav {
    background-color: #f9fafb !important;
    color: #000000 !important;
    border-color: #e5e7eb !important;
  }

  /* Sidebar light */
  aside, .sidebar {
    background-color: #ffffff !important;
    color: #000000 !important;
    border-right: 1px solid #e5e7eb !important;
  }
`

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    return { theme: 'light', setTheme: () => {} }
  }
  return context
}
