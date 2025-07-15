import type { Server as NetServer } from "http"
import type { NextApiRequest, NextApiResponse } from "next"
import { Server as ServerIO } from "socket.io"
import { verifyToken } from "@/lib/jwt"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"

export type NextApiResponseServerIO = NextApiResponse & {
    socket: {
        server: NetServer & {
            io: ServerIO
        }
    }
}

const SocketHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
    if (res.socket.server.io) {
        console.log("Socket is already running")
    } else {
        console.log("Socket is initializing")
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
                const decoded = verifyToken(token)

                if (!decoded) {
                    return next(new Error("Authentication error"))
                }

                await dbConnect()
                await User.findByIdAndUpdate(decoded.userId, {
                    isOnline: true,
                    lastSeen: new Date(),
                })

                socket.userId = decoded.userId
                socket.username = decoded.username
                next()
            } catch (error) {
                next(new Error("Authentication error"))
            }
        })

        io.on("connection", (socket) => {
            // Join user to their personal room for notifications
            socket.join(socket.userId)

            // Handle joining conversation rooms
            socket.on("join-conversation", (conversationId) => {
                socket.join(conversationId)
            })

            // Handle leaving conversation rooms
            socket.on("leave-conversation", (conversationId) => {
                socket.leave(conversationId)
            })

            // Handle sending messages
            socket.on("send-message", (data) => {
                const { conversationId, message, recipientId } = data

                socket.to(conversationId).emit("new-message", message)
                socket.to(recipientId).emit("message-notification", {
                    senderId: socket.userId,
                    senderUsername: socket.username,
                    conversationId,
                    message,
                })
            })

            // Handle typing indicators
            socket.on("typing", (data) => {
                socket.to(data.conversationId).emit("user-typing", {
                    userId: socket.userId,
                    username: socket.username,
                })
            })

            socket.on("stop-typing", (data) => {
                socket.to(data.conversationId).emit("user-stop-typing", {
                    userId: socket.userId,
                })
            })

            // Handle friend request events
            socket.on("friend-request-sent", (data) => {
                socket.to(data.recipientId).emit("friend-request-received", data)
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
                friendIds.forEach((friendId) => {
                    socket.to(friendId).emit("friend-status-change", {
                        userId: socket.userId,
                        username: socket.username,
                        isOnline: true,
                    })
                })
            })

            socket.on("disconnect", async () => {
                try {
                    await dbConnect()
                    await User.findByIdAndUpdate(socket.userId, {
                        isOnline: false,
                        lastSeen: new Date(),
                    })

                    // Notify friends about offline status
                    socket.broadcast.emit("friend-status-change", {
                        userId: socket.userId,
                        username: socket.username,
                        isOnline: false,
                    })
                } catch (error) {
                    console.error("Error updating user offline status:", error)
                }
            })
        })
    }
    res.end()
}

export default SocketHandler
