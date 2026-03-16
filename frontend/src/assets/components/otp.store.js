import { create } from "zustand"
import { persist } from "zustand/middleware"

export const OtpStore = create(persist((set) => ({
    number: "",
    setnumber: (number) => set({ number }),
    clearNumber: () => set({ number: "" }),
}),{
    name: "otp-storage"
}))