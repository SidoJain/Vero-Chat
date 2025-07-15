"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { LogOut, MessageSquare } from "lucide-react"
import Friends from "./Friends"
import Chat from "./Chat"
import { useSocket } from "@/contexts/SocketContext"

interface Friend {
    id: string
    username: string
    email: string
    avatar?: string
    isOnline: boolean
    lastSeen: string
    friendshipId: string
}

export default function ChatRoom() {
    const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
    const [showChat, setShowChat] = useState(false)
    const { user, token, logout } = useAuth()
    const router = useRouter()
    const { socket } = useSocket()

    useEffect(() => {
        if (!user) {
            router.push("/")
            return
        }

        if (socket) {
            socket.on("friend-status-change", (data) => {
                console.log("Friend status changed:", data)
            })

            socket.on("message-notification", (data) => {
                console.log("New message notification:", data)
            })

            return () => {
                socket.off("friend-status-change")
                socket.off("message-notification")
            }
        }
    }, [user, router, socket])

    const handleSelectFriend = (friend: Friend) => {
        setSelectedFriend(friend)
        setShowChat(true)
    }

    const handleBackToFriends = () => {
        setShowChat(false)
        setSelectedFriend(null)
    }

    const handleLogout = () => {
        logout()
        router.push("/")
    }

    if (!user) return null

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
            {/* Backdrop Image */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
            />

            <div className="relative z-10 container mx-auto px-4 py-6 h-screen flex flex-col">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                {showChat && selectedFriend ? `Chat with ${selectedFriend.username}` : "Friends & Messages"}
                            </h1>
                            <p className="text-gray-300">Welcome back, {user.username}!</p>
                        </div>
                    </div>
                    <Button
                        onClick={handleLogout}
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-hidden">
                    {showChat && selectedFriend ? (
                        <Chat friend={selectedFriend} onBack={handleBackToFriends} />
                    ) : (
                        <div className="h-full overflow-y-auto">
                            <Friends onSelectFriend={handleSelectFriend} selectedFriend={selectedFriend} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
