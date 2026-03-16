import { create } from "zustand"
import { persist } from "zustand/middleware"

export const userStore = create(persist((set) => ({
    user: {
        _id: "",
        name: "",
        email: "",
    },
    setUser: (user) => set({ user }),
    clearUser: () => set({ user: { _id: "", name: "", email: "" }}),
}),
    { name: "user-storage" }
))