import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      farm_id?: string | null
      farm_name?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: string
    farm_id?: string | null
    farm_name?: string | null
  }
}
