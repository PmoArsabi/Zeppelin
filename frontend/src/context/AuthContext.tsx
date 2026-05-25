/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type UserRole = 'admin' | 'coordinador_mice' | 'asesor_mice' | 'tiqueteador_mice'

export interface Permissions {
  isAdmin: boolean
  canViewMice: boolean
  canEditMice: boolean
  canCreateMice: boolean
  canManageUsers: boolean
}

function derivePermissions(role: UserRole): Permissions {
  return {
    isAdmin:        role === 'admin',
    canViewMice:    true,
    canEditMice:    role === 'admin' || role === 'coordinador_mice' || role === 'asesor_mice',
    canCreateMice:  role === 'admin' || role === 'coordinador_mice',
    canManageUsers: role === 'admin',
  }
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  role: UserRole
  permissions: Permissions
  isAdmin: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const VALID_ROLES: UserRole[] = ['admin', 'coordinador_mice', 'asesor_mice', 'tiqueteador_mice']
  const rawRole = user?.app_metadata?.role
  const role: UserRole = VALID_ROLES.includes(rawRole) ? rawRole : 'asesor_mice'
  const permissions = derivePermissions(role)

  const signOut = async () => { await supabase.auth.signOut() }

  return (
    <AuthContext.Provider value={{ user, session, loading, role, permissions, isAdmin: permissions.isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function usePermissions(): Permissions {
  return useAuth().permissions
}
