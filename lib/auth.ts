import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getTeamByUsername } from "./teams";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Tim Kerja",
      credentials: {
        username: { label: "Username Tim", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const team = getTeamByUsername(credentials.username);
        if (!team) return null;

        const isValid = await bcrypt.compare(credentials.password, team.passwordHash);
        if (!isValid) return null;

        // Only non-sensitive identifiers go into the session/JWT.
        return {
          id: team.id,
          name: team.name,
          username: team.username,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.teamId = (user as any).id;
        token.teamName = (user as any).name;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).teamId = token.teamId;
      (session as any).teamName = token.teamName;
      return session;
    },
  },
};
