import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Message from "@/models/Message"
import Friend from "@/models/Friend"
import { verifyToken } from "@/lib/jwt"

// Get messages for a conversation
export async function GET(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "")
        const { searchParams } = new URL(request.url)
        const recipientId = searchParams.get("recipientId")

        if (!token) {
            return NextResponse.json({ error: "No token provided" }, { status: 401 })
        }

        const decoded = verifyToken(token)
        if (!decoded) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }

        if (!recipientId) {
            return NextResponse.json({ error: "Recipient ID is required" }, { status: 400 })
        }

        await dbConnect()

        // Check if users are friends
        const friendship = await Friend.findOne({
            $or: [
                { requester: decoded.userId, recipient: recipientId, status: "accepted" },
                { requester: recipientId, recipient: decoded.userId, status: "accepted" },
            ],
        })

        if (!friendship) {
            return NextResponse.json({ error: "You can only message friends" }, { status: 403 })
        }

        // Create conversation ID (consistent regardless of who sends first)
        const conversationId = [decoded.userId, recipientId].sort().join("-")

        const messages = await Message.find({ conversationId })
            .populate("sender", "username avatar")
            .populate("recipient", "username avatar")
            .sort({ createdAt: 1 })
            .limit(100)

        // Mark messages as read
        await Message.updateMany(
            {
                conversationId,
                recipient: decoded.userId,
                isRead: false,
            },
            { isRead: true },
        )

        return NextResponse.json({ messages })
    } catch (error) {
        console.error("Get messages error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// Send a message
export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "")

        if (!token) {
            return NextResponse.json({ error: "No token provided" }, { status: 401 })
        }

        const decoded = verifyToken(token)
        if (!decoded) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }

        const { content, recipientId } = await request.json()

        if (!content || !recipientId) {
            return NextResponse.json({ error: "Content and recipient are required" }, { status: 400 })
        }

        await dbConnect()

        // Check if users are friends
        const friendship = await Friend.findOne({
            $or: [
                { requester: decoded.userId, recipient: recipientId, status: "accepted" },
                { requester: recipientId, recipient: decoded.userId, status: "accepted" },
            ],
        })

        if (!friendship) {
            return NextResponse.json({ error: "You can only message friends" }, { status: 403 })
        }

        // Create conversation ID
        const conversationId = [decoded.userId, recipientId].sort().join("-")

        const message = await Message.create({
            content: content.trim(),
            sender: decoded.userId,
            recipient: recipientId,
            conversationId,
        })

        const populatedMessage = await Message.findById(message._id)
            .populate("sender", "username avatar")
            .populate("recipient", "username avatar")

        return NextResponse.json({ message: populatedMessage })
    } catch (error) {
        console.error("Send message error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
