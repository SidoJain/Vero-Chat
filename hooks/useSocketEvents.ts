"use client"

import { useEffect } from "react"
import { useSocket } from "@/contexts/SocketContext"

interface UseSocketEventsProps {
    onFriendRequestReceived?: (data: any) => void
    onFriendRequestResponse?: (data: any) => void
    onFriendStatusChange?: (data: any) => void
    onNewMessage?: (data: any) => void
    onMessageNotification?: (data: any) => void
    onUserTyping?: (data: any) => void
    onUserStopTyping?: (data: any) => void
}

export function useSocketEvents({
    onFriendRequestReceived,
    onFriendRequestResponse,
    onFriendStatusChange,
    onNewMessage,
    onMessageNotification,
    onUserTyping,
    onUserStopTyping,
}: UseSocketEventsProps) {
    const { socket } = useSocket()

    useEffect(() => {
        if (!socket) return

        if (onFriendRequestReceived) {
            socket.on("friend-request-received", onFriendRequestReceived)
        }
        if (onFriendRequestResponse) {
            socket.on("friend-request-response", onFriendRequestResponse)
        }
        if (onFriendStatusChange) {
            socket.on("friend-status-change", onFriendStatusChange)
        }
        if (onNewMessage) {
            socket.on("new-message", onNewMessage)
        }
        if (onMessageNotification) {
            socket.on("message-notification", onMessageNotification)
        }
        if (onUserTyping) {
            socket.on("user-typing", onUserTyping)
        }
        if (onUserStopTyping) {
            socket.on("user-stop-typing", onUserStopTyping)
        }

        return () => {
            socket.off("friend-request-received")
            socket.off("friend-request-response")
            socket.off("friend-status-change")
            socket.off("new-message")
            socket.off("message-notification")
            socket.off("user-typing")
            socket.off("user-stop-typing")
        }
    }, [
        socket,
        onFriendRequestReceived,
        onFriendRequestResponse,
        onFriendStatusChange,
        onNewMessage,
        onMessageNotification,
        onUserTyping,
        onUserStopTyping,
    ])

    return { socket }
}
