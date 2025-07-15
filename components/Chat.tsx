"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, ArrowLeft } from "lucide-react"
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

interface Message {
    _id: string
    content: string
    sender: {
        _id: string
        username: string
        avatar?: string
    }
    recipient: {
        _id: string
        username: string
        avatar?: string
    }
    createdAt: string
    isRead: boolean
}

interface ChatProps {
    friend: Friend
    onBack: () => void
}

export default function Chat({ friend, onBack }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [typing, setTyping] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const typingTimeoutRef = useRef<NodeJS.Timeout>()
    const { user, token } = useAuth()
    const { socket, isConnected } = useSocket()

    const conversationId = user && friend ? [user.id, friend.id].sort().join("-") : ""

    useEffect(() => {
        if (friend && token) {
            loadMessages()
        }
    }, [friend, token])

    useEffect(() => {
        if (socket && isConnected && conversationId) {
            socket.emit("join-conversation", conversationId)

            // Handle incoming messages
            const handleNewMessage = (message: Message) => {
                setMessages((prev) => [...prev, message])
            }

            const handleUserTyping = (data: any) => {
                if (data.userId === friend.id) {
                    setTyping(true)
                }
            }

            const handleUserStopTyping = (data: any) => {
                if (data.userId === friend.id) {
                    setTyping(false)
                }
            }

            socket.on("new-message", handleNewMessage)
            socket.on("user-typing", handleUserTyping)
            socket.on("user-stop-typing", handleUserStopTyping)

            return () => {
                socket.emit("leave-conversation", conversationId)
                socket.off("new-message", handleNewMessage)
                socket.off("user-typing", handleUserTyping)
                socket.off("user-stop-typing", handleUserStopTyping)
            }
        }
    }, [socket, isConnected, conversationId, friend.id])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const loadMessages = async () => {
        try {
            const response = await fetch(`/api/messages?recipientId=${friend.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (response.ok) {
                const data = await response.json()
                setMessages(data.messages)
            }
        } catch (error) {
            console.error("Error loading messages:", error)
        }
    }

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || loading) return

        setLoading(true)

        try {
            const response = await fetch("/api/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    content: newMessage,
                    recipientId: friend.id,
                }),
            })

            if (response.ok) {
                const data = await response.json()
                setMessages((prev) => [...prev, data.message])

                if (socket && isConnected) {
                    socket.emit("send-message", {
                        conversationId,
                        recipientId: friend.id,
                        message: data.message,
                    })
                } else {
                    console.warn("⚠️ Socket not connected, message not sent in real-time")
                }

                setNewMessage("")
            }
        } catch (error) {
            console.error("Error sending message:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleTyping = () => {
        if (socket && isConnected) {
            socket.emit("typing", { conversationId })

            // Clear existing timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }

            // Set new timeout to stop typing
            typingTimeoutRef.current = setTimeout(() => {
                if (socket && isConnected) {
                    socket.emit("stop-typing", { conversationId })
                }
            }, 1000)
        }
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    return (
        <Card className="h-full bg-white/5 backdrop-blur-md border-white/20 flex flex-col">
            {/* Header */}
            <CardHeader className="pb-3 border-b border-white/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-white/10">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
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
                            <CardTitle className="text-white text-lg">{friend.username}</CardTitle>
                            <p className="text-gray-300 text-sm">{friend.isOnline ? "Online" : "Offline"}</p>
                        </div>
                    </div>
                    <ConnectionStatus />
                </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message._id}
                            className={`flex ${message.sender._id === user?.id ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.sender._id === user?.id
                                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                                        : "bg-white/10 text-white border border-white/20"
                                    }`}
                            >
                                <p className="text-sm">{message.content}</p>
                                <p className="text-xs opacity-70 mt-1">{formatTime(message.createdAt)}</p>
                            </div>
                        </div>
                    ))}
                    {typing && (
                        <div className="flex justify-start">
                            <div className="bg-white/10 text-white border border-white/20 px-4 py-2 rounded-lg">
                                <p className="text-sm italic">{friend.username} is typing...</p>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </CardContent>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10">
                <form onSubmit={sendMessage} className="flex space-x-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value)
                            handleTyping()
                        }}
                        placeholder={`Message ${friend.username}...`}
                        className="flex-1 bg-white/10 border-white/20 text-white placeholder-gray-300"
                        maxLength={1000}
                        disabled={!isConnected}
                    />
                    <Button
                        type="submit"
                        disabled={!newMessage.trim() || loading || !isConnected}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </div>
        </Card>
    )
}
