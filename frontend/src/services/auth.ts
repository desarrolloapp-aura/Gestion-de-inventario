import api from './api'

export interface LoginCredentials {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  rol: string
  obra?: string
}

import { User } from '../types'

export type { User }

export const authService = {
  login: async (credentials: LoginCredentials) => {
    const { data } = await api.post<TokenResponse>('/api/auth/login', credentials)
    return data
  },
  
  getMe: async () => {
    const { data } = await api.get<User>('/api/auth/me')
    return data
  },
  
  changePassword: async (oldPassword: string, newPassword: string) => {
    const { data } = await api.put('/api/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword
    })
    return data
  },
  
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },
}




