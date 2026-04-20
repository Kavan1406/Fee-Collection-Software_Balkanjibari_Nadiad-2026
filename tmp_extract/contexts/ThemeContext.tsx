'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface ThemeContextType {
    isDarkMode: boolean
    toggleDarkMode: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [isDarkMode, setIsDarkMode] = useState(false)

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme')
        
        // If a saved theme exists, use it
        if (savedTheme === 'dark') {
            setIsDarkMode(true)
            document.documentElement.classList.add('dark')
        } else if (savedTheme === 'light') {
            setIsDarkMode(false)
            document.documentElement.classList.remove('dark')
        } else {
            // Otherwise, check system preference
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            setIsDarkMode(systemPrefersDark)
            if (systemPrefersDark) {
                document.documentElement.classList.add('dark')
            } else {
                document.documentElement.classList.remove('dark')
            }
        }

        // Setup listener for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handleChange = (e: MediaQueryListEvent) => {
            if (!localStorage.getItem('theme')) {
                setIsDarkMode(e.matches)
                if (e.matches) {
                    document.documentElement.classList.add('dark')
                } else {
                    document.documentElement.classList.remove('dark')
                }
            }
        }
        
        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    // Apply dark mode class whenever it changes manually
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [isDarkMode])

    const toggleDarkMode = () => {
        console.log('Toggle clicked - current isDarkMode:', isDarkMode)
        setIsDarkMode(prev => {
            const newValue = !prev
            console.log('Toggle - new isDarkMode:', newValue)
            return newValue
        })
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
