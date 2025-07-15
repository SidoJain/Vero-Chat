import type React from "react"
import type { Metadata } from "next"
import { AuthProvider } from "@/contexts/AuthContext"
import { SocketProvider } from "@/contexts/SocketContext"
import "./globals.css"

export const metadata: Metadata = {
    title: "Vero Chat",
    description: "A modern real-time chat application built with Next.js",
    icons: {
        icon: "/favicon.ico"
    }
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body className={`antialiased`}>
                <AuthProvider>
                    <SocketProvider>{children}</SocketProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
