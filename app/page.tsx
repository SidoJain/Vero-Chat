"use client"

import { useAuth } from "@/contexts/AuthContext"
import AuthForm from "@/components/AuthForm"
import ChatRoom from "@/components/ChatRoom"

export default function Home() {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
                <div className="flex items-center gap-3 text-white text-xl">
                    <svg className="w-6 h-6 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.372 0 0 5.372 0 12h4z"
                        ></path>
                    </svg>
                    Loading...
                </div>
            </div>

        )
    }

    return user ? <ChatRoom /> : <AuthForm />
}
