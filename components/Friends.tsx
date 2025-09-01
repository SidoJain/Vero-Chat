"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Check, X, MessageCircle, Users, Clock } from "lucide-react"
import { useSocket } from "@/contexts/SocketContext"
import ConnectionStatus from "./ConnectionStatus"

interface Friend {
    id: string
    username: string
    email: string
    avatar?: string
    isOnline: boolean
    lastSeen: string
    friendshipId: string
}

interface FriendRequest {
    id: string
    requester: {
        _id: string
        username: string
        email: string
        avatar?: string
    }
    createdAt: string
}

interface FriendsProps {
    onSelectFriend: (friend: Friend) => void
    selectedFriend: Friend | null
}

export default function Friends({ onSelectFriend, selectedFriend }: FriendsProps) {
    const [friends, setFriends] = useState<Friend[]>([])
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
    const [sentRequests, setSentRequests] = useState<any[]>([])
    const [newFriendUsername, setNewFriendUsername] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const { token, user } = useAuth()
    const { socket, isConnected } = useSocket()

    useEffect(() => {
        loadFriends()
    }, [])

    const loadFriends = async () => {
        try {
            const response = await fetch("/api/friends", {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (response.ok) {
                const data = await response.json()
                setFriends(data.friends)
                setPendingRequests(data.pendingRequests)
                setSentRequests(data.sentRequests)
            }
        } catch (error) {
            console.error("Error loading friends:", error)
        }
    }

    useEffect(() => {
        if (socket && isConnected) {
            // Handle incoming friend requests
            const handleFriendRequestReceived = (data: any) => {
                setPendingRequests((prev) => [
                    ...prev,
                    {
                        id: data.requestId,
                        requester: data.requester,
                        createdAt: new Date().toISOString(),
                    },
                ])
            }

            // Handle friend request responses
            const handleFriendRequestResponse = (data: any) => {
                if (data.type === "accepted") {
                    setFriends((prev) => [...prev, data.friend])
                    setSentRequests((prev) => prev.filter((req) => req.recipient._id !== data.friend.id))
                } else if (data.type === "rejected") {
                    setSentRequests((prev) => prev.filter((req) => req.id !== data.requestId))
                }
            }

            // Handle friend status changes
            const handleFriendStatusChange = (data: any) => {
                setFriends((prev) =>
                    prev.map((friend) =>
                        friend.id === data.userId
                            ? { ...friend, isOnline: data.isOnline, lastSeen: new Date().toISOString() }
                            : friend,
                    ),
                )
            }

            socket.on("friend-request-received", handleFriendRequestReceived)
            socket.on("friend-request-response", handleFriendRequestResponse)
            socket.on("friend-status-change", handleFriendStatusChange)

            return () => {
                socket.off("friend-request-received", handleFriendRequestReceived)
                socket.off("friend-request-response", handleFriendRequestResponse)
                socket.off("friend-status-change", handleFriendStatusChange)
            }
        }
    }, [socket, isConnected])

    const sendFriendRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newFriendUsername.trim()) return

        setLoading(true)
        setError("")

        try {
            const response = await fetch("/api/friends", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ recipientUsername: newFriendUsername }),
            })

            const data = await response.json()

            if (response.ok) {
                setNewFriendUsername("")
                setSentRequests((prev) => [...prev, data.friendRequest])

                if (socket && isConnected) {
                    socket.emit("friend-request-sent", {
                        recipientId: data.friendRequest.recipient.id,
                        requestId: data.friendRequest.id,
                        requester: {
                            _id: user?.id,
                            username: user?.username,
                            email: user?.email,
                            avatar: user?.avatar,
                        },
                    })
                } else {
                    console.warn("⚠️ Socket not connected, friend request notification not sent")
                }
            } else {
                setError(data.error)
            }
        } catch {
            setError("Failed to send friend request")
        } finally {
            setLoading(false)
        }
    }

    const handleFriendRequest = async (requestId: string, action: "accept" | "reject") => {
        try {
            const response = await fetch(`/api/friends/${requestId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ action }),
            })

            const data = await response.json()
            if (response.ok) {
                // Remove from pending requests immediately
                const request = pendingRequests.find((req) => req.id === requestId)
                setPendingRequests((prev) => prev.filter((req) => req.id !== requestId))

                if (socket && isConnected && request) {
                    if (action === "accept") {
                        setFriends((prev) => [...prev, data.friend])

                        // Notify requester
                        socket.emit("friend-request-accepted", {
                            requesterId: request.requester._id,
                            friend: data.friend,
                        })
                    } else {
                        // Notify requester of rejection
                        socket.emit("friend-request-rejected", {
                            requesterId: request.requester._id,
                            requestId,
                        })
                    }
                } else {
                    console.warn("⚠️ Socket not connected, friend request response not sent")
                }
            }
        } catch (error) {
            console.error("Error handling friend request:", error)
        }
    }

    const formatLastSeen = (lastSeen: string) => {
        const date = new Date(lastSeen)
        const now = new Date()
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

        if (diffInMinutes < 1) return "Just now"
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
        return `${Math.floor(diffInMinutes / 1440)}d ago`
    }

    return (
        <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex justify-end">
                <ConnectionStatus />
            </div>

            {/* Add Friend */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <UserPlus className="w-5 h-5" />
                        Add Friend
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={sendFriendRequest} className="space-y-3">
                        <Input
                            type="text"
                            placeholder="Enter username"
                            value={newFriendUsername}
                            onChange={(e) => setNewFriendUsername(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder-gray-300"
                        />
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <Button
                            type="submit"
                            disabled={loading || !isConnected}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                            {loading ? "Sending..." : "Send Request"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Friend Requests */}
            {pendingRequests.length > 0 && (
                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Friend Requests ({pendingRequests.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {pendingRequests.map((request) => (
                            <div key={request.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                <div>
                                    <p className="text-white font-medium">{request.requester.username}</p>
                                    <p className="text-gray-300 text-sm">{request.requester.email}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => handleFriendRequest(request.id, "accept")}
                                        className="bg-green-600 hover:bg-green-700"
                                        disabled={!isConnected}
                                    >
                                        <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleFriendRequest(request.id, "reject")}
                                        className="bg-red-600 hover:bg-red-700 border-red-600"
                                        disabled={!isConnected}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Friends List */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Friends ({friends.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {friends.length === 0 ? (
                        <p className="text-gray-300 text-center py-4">No friends yet. Add some friends to start chatting!</p>
                    ) : (
                        friends.map((friend) => (
                            <div
                                key={friend.id}
                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedFriend?.id === friend.id ? "bg-white/20" : "bg-white/5 hover:bg-white/10"
                                    }`}
                                onClick={() => onSelectFriend(friend)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                            <span className="text-white font-medium">{friend.username[0].toUpperCase()}</span>
                                        </div>
                                        <div
                                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 ${friend.isOnline ? "bg-green-500" : "bg-gray-500"
                                                }`}
                                        />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{friend.username}</p>
                                        <p className="text-gray-300 text-sm">
                                            {friend.isOnline ? "Online" : `Last seen ${formatLastSeen(friend.lastSeen)}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={friend.isOnline ? "default" : "secondary"} className="text-xs">
                                        {friend.isOnline ? "Online" : "Offline"}
                                    </Badge>
                                    <Button size="sm" variant="ghost" className="text-white hover:bg-white/10">
                                        <MessageCircle className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
