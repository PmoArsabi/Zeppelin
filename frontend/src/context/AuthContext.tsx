/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type UserRole = 'admin' | 'coordinador' | 'asesor' | 'tiqueteador' | 'financiero'
export type UnidadSlug = 'mice' | 'corp' | 'siigo'

export interface Permissions {
  isAdmin: boolean
  canManageUsers: boolean
  canManageRoles: boolean
}

function derivePermissions(role: UserRole): Permissions {
  return {
    isAdmin:         role === 'admin',
    canManageUsers:  role === 'admin',
    canManageRoles:  role === 'admin',
  }
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  role: UserRole
  unidades: UnidadSlug[]
  permissions: Permissions
  isAdmin: boolean
  /** Nombre para mostrar del usuario logueado (de td_profiles). Fallback: email. */
  displayName: string
  hasPermission: (unidad: UnidadSlug, permiso: string) => boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [unidades, setUnidades] = useState<UnidadSlug[]>([])
  const [displayName, setDisplayName] = useState('')

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

  // Cargar display_name desde td_profiles
  useEffect(() => {
    if (!user) { setDisplayName(''); return }
    supabase
      .from('td_profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setDisplayName(data?.display_name?.trim() || user.email || '')
      })
  }, [user])

  // Cargar unidades asignadas al usuario
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!user) { setUnidades([]); return }

    const rawRole = user.app_metadata?.role
    if (rawRole === 'admin') {
      // Admin ve todas las unidades
      setUnidades(['mice', 'corp'])
      return
    }

    supabase
      .rpc('rbac_get_mis_unidades')
      .then(({ data }) => {
        const slugs = (data ?? [])
          .map((row: { slug: string }) => row.slug)
          .filter((s: string | undefined): s is UnidadSlug => !!s)
        setUnidades(slugs)
      })
  }, [user])

  const VALID_ROLES: UserRole[] = ['admin', 'coordinador', 'asesor', 'tiqueteador', 'financiero']
  const rawRole = user?.app_metadata?.role
  const role: UserRole = VALID_ROLES.includes(rawRole) ? rawRole : 'tiqueteador'
  const permissions = derivePermissions(role)

  // Permisos por unidad — el admin tiene todo; el resto se evalúa en BD via RLS.
  // Esta función es para controles de UI (mostrar/ocultar botones).
  // La seguridad real la hace RLS en el servidor.
  function hasPermission(unidad: UnidadSlug, permiso: string): boolean {
    if (role === 'admin') return true
    if (!unidades.includes(unidad)) return false
    const permisosPorRol: Record<UserRole, string[]> = {
      admin:       ['ver', 'crear', 'editar', 'eliminar'],
      coordinador: ['ver', 'crear', 'editar'],
      asesor:      ['ver', 'editar'],
      tiqueteador: ['ver'],
      financiero:  [],
    }
    return permisosPorRol[role]?.includes(permiso) ?? false
  }

  const signOut = async () => { await supabase.auth.signOut() }

  return (
    <AuthContext.Provider value={{
      user, session, loading, role, unidades, permissions,
      isAdmin: permissions.isAdmin, displayName, hasPermission, signOut,
    }}>
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
