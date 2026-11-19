import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Same persisted keys as before ("user-storage", "otp-storage") so existing sessions survive the redesign.

export const userStore = create(
  persist(
    (set) => ({
      user: { _id: '', name: '', email: '' },
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: { _id: '', name: '', email: '' } }),
    }),
    { name: 'user-storage' },
  ),
)

export const OtpStore = create(
  persist(
    (set) => ({
      number: '',
      setnumber: (number) => set({ number }),
      clearNumber: () => set({ number: '' }),
    }),
    { name: 'otp-storage' },
  ),
)
