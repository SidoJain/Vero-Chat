import type { NextApiRequest, NextApiResponse } from "next"
import type { Server as NetServer } from "http"
import type { Socket as NetSocket } from "net"
import { Server as ServerIO } from "socket.io"
import { verifyToken } from "@/lib/jwt"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"

export type NextApiResponseServerIO = NextApiResponse & {
    socket: NetSocket & {
        server: NetServer & {
            io: ServerIO
        }
    }
}

const SocketHandler = async (req: NextApiRequest, res: NextApiResponseServerIO) => {
    if (res.socket.server.io) {
        res.end()
        return
    }

    const io = new ServerIO(res.socket.server, {
        path: "/api/socketio",
        addTrailingSlash: false,
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    })

    res.socket.server.io = io

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token
            if (!token) {
                return next(new Error("No token provided"))
            }

            const decoded = verifyToken(token)
            if (!decoded) {
                return next(new Error("Invalid token"))
            }

            await dbConnect()
            await User.findByIdAndUpdate(decoded.userId, {
                isOnline: true,
                lastSeen: new Date(),
            })
                ; (socket as any).userId = decoded.userId
                ; (socket as any).username = decoded.username
                ; (socket as any).email = decoded.email

            next()
        } catch (error) {
            console.error("Socket authentication error:", error)
            next(new Error("Authentication error"))
        }
    })

    io.on("connection", (socket) => {
        const userId = (socket as any).userId
        const username = (socket as any).username

        socket.join(userId)
        socket.on("join-conversation", (conversationId) => {
            socket.join(conversationId)
        })

        socket.on("leave-conversation", (conversationId) => {
            socket.leave(conversationId)
        })

        socket.on("send-message", (data) => {
            const { conversationId, message, recipientId } = data
            socket.to(conversationId).emit("new-message", message)

            socket.to(recipientId).emit("message-notification", {
                senderId: userId,
                senderUsername: username,
                conversationId,
                message,
            })
        })

        // Handle typing indicators
        socket.on("typing", (data) => {
            socket.to(data.conversationId).emit("user-typing", {
                userId,
                username,
            })
        })

        socket.on("stop-typing", (data) => {
            socket.to(data.conversationId).emit("user-stop-typing", {
                userId,
            })
        })

        // Handle friend request events
        socket.on("friend-request-sent", (data) => {
            socket.to(data.recipientId).emit("friend-request-received", {
                requestId: data.requestId,
                requester: data.requester,
            })
        })

        socket.on("friend-request-accepted", (data) => {
            socket.to(data.requesterId).emit("friend-request-response", {
                type: "accepted",
                friend: data.friend,
            })
        })

        socket.on("friend-request-rejected", (data) => {
            socket.to(data.requesterId).emit("friend-request-response", {
                type: "rejected",
                requestId: data.requestId,
            })
        })

        // Handle friend status updates
        socket.on("update-friend-status", (friendIds) => {
            friendIds.forEach((friendId: string) => {
                socket.to(friendId).emit("friend-status-change", {
                    userId,
                    username,
                    isOnline: true,
                })
            })
        })

        socket.on("disconnect", async () => {
            try {
                await dbConnect()
                await User.findByIdAndUpdate(userId, {
                    isOnline: false,
                    lastSeen: new Date(),
                })

                // Notify friends about offline status
                socket.broadcast.emit("friend-status-change", {
                    userId,
                    username,
                    isOnline: false,
                })
            } catch (error) {
                console.error("Error updating user offline status:", error)
            }
        })
    })

    res.end()
}

export default SocketHandler
