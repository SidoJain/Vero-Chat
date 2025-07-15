"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { io, type Socket } from "socket.io-client"
import { useAuth } from "./AuthContext"

interface SocketContextType {
    socket: Socket | null
    isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false })

export function SocketProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const { token, user } = useAuth()

    useEffect(() => {
        if (token && user) {
            fetch("/api/socketio")
                .then(() => {
                    const socketInstance = io({
                        path: "/api/socketio",
                        auth: { token },
                        forceNew: true,
                        transports: ["websocket", "polling"],
                    })

                    socketInstance.on("connect", () => {
                        setIsConnected(true)
                    })

                    socketInstance.on("disconnect", (reason) => {
                        setIsConnected(false)
                    })

                    socketInstance.on("connect_error", (error) => {
                        console.error("🔥 Socket connection error:", error)
                        setIsConnected(false)
                    })

                    setSocket(socketInstance)

                    return () => {
                        socketInstance.disconnect()
                    }
                })
                .catch((error) => {
                    console.error("Failed to initialize Socket.io server:", error)
                })

            return () => {
                if (socket) {
                    socket.disconnect()
                    setSocket(null)
                    setIsConnected(false)
                }
            }
        }
    }, [token, user])

    return <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
}

export function useSocket() {
    return useContext(SocketContext)
}
