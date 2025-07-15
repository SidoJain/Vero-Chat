import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Friend from "@/models/Friend"
import User from "@/models/User"
import { verifyToken } from "@/lib/jwt"

// Get friends and friend requests
export async function GET(request: NextRequest) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "")

        if (!token) {
            return NextResponse.json({ error: "No token provided" }, { status: 401 })
        }

        const decoded = verifyToken(token)
        if (!decoded) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }

        await dbConnect()

        // Get accepted friends
        const friends = await Friend.find({
            $or: [
                { requester: decoded.userId, status: "accepted" },
                { recipient: decoded.userId, status: "accepted" },
            ],
        })
            .populate("requester", "username email avatar isOnline lastSeen")
            .populate("recipient", "username email avatar isOnline lastSeen")

        // Get pending friend requests (received)
        const pendingRequests = await Friend.find({
            recipient: decoded.userId,
            status: "pending",
        }).populate("requester", "username email avatar")

        // Get sent friend requests
        const sentRequests = await Friend.find({
            requester: decoded.userId,
            status: "pending",
        }).populate("recipient", "username email avatar")

        // Format friends list
        const friendsList = friends.map((friend) => {
            const friendUser = friend.requester._id.toString() === decoded.userId ? friend.recipient : friend.requester
            return {
                id: friendUser._id,
                username: friendUser.username,
                email: friendUser.email,
                avatar: friendUser.avatar,
                isOnline: friendUser.isOnline,
                lastSeen: friendUser.lastSeen,
                friendshipId: friend._id,
            }
        })

        return NextResponse.json({
            friends: friendsList,
            pendingRequests: pendingRequests.map((req) => ({
                id: req._id,
                requester: req.requester,
                createdAt: req.createdAt,
            })),
            sentRequests: sentRequests.map((req) => ({
                id: req._id,
                recipient: req.recipient,
                createdAt: req.createdAt,
            })),
        })
    } catch (error) {
        console.error("Get friends error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// Send friend request
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

        const { recipientUsername } = await request.json()

        if (!recipientUsername) {
            return NextResponse.json({ error: "Recipient username is required" }, { status: 400 })
        }

        await dbConnect()

        // Find recipient user
        const recipient = await User.findOne({ username: recipientUsername })
        if (!recipient) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        if (recipient._id.toString() === decoded.userId) {
            return NextResponse.json({ error: "Cannot send friend request to yourself" }, { status: 400 })
        }

        // Check if friendship already exists
        const existingFriendship = await Friend.findOne({
            $or: [
                { requester: decoded.userId, recipient: recipient._id },
                { requester: recipient._id, recipient: decoded.userId },
            ],
        })

        if (existingFriendship) {
            if (existingFriendship.status === "accepted") {
                return NextResponse.json({ error: "Already friends" }, { status: 400 })
            } else if (existingFriendship.status === "pending") {
                return NextResponse.json({ error: "Friend request already sent" }, { status: 400 })
            }
        }

        // Create friend request
        const friendRequest = await Friend.create({
            requester: decoded.userId,
            recipient: recipient._id,
            status: "pending",
        })

        return NextResponse.json({
            message: "Friend request sent successfully",
            friendRequest: {
                id: friendRequest._id,
                recipient: {
                    id: recipient._id,
                    username: recipient.username,
                    email: recipient.email,
                    avatar: recipient.avatar,
                },
            },
        })
    } catch (error) {
        console.error("Send friend request error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
