'use client'

import React, { createContext, useContext, useEffect } from 'react'

interface ThemeContextType {
    isDarkMode: boolean
    toggleDarkMode: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const isDarkMode = false

    useEffect(() => {
        // Force light mode globally and ignore system/theme storage.
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
    }, [])

    const toggleDarkMode = () => {
        // Dark mode is disabled by requirement; keep light mode always.
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
    }

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
