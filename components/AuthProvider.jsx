'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, supabaseConfigurado } from '@/lib/supabaseClient';

const AuthContext = createContext({ usuario: null, cargando: true });

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!supabaseConfigurado) {
      setCargando(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setUsuario(data.session?.user ?? null);
      setCargando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, session) => {
      setUsuario(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
