"use client"

import { useSocket } from "@/contexts/SocketContext"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff } from "lucide-react"

export default function ConnectionStatus() {
    const { isConnected } = useSocket()

    return (
        <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center gap-1">
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? "Connected" : "Disconnected"}
        </Badge>
    )
}
