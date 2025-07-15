import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Friend from "@/models/Friend"
import { verifyToken } from "@/lib/jwt"

// Accept or reject friend request
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "")

        if (!token) {
            return NextResponse.json({ error: "No token provided" }, { status: 401 })
        }

        const decoded = verifyToken(token)
        if (!decoded) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }

        const { action } = await request.json()
        const friendRequestId = params.id

        await dbConnect()

        const friendRequest = await Friend.findById(friendRequestId)
        if (!friendRequest) {
            return NextResponse.json({ error: "Friend request not found" }, { status: 404 })
        }

        // Only recipient can accept/reject
        if (friendRequest.recipient.toString() !== decoded.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        if (action === "accept") {
            friendRequest.status = "accepted"
            await friendRequest.save()

            await friendRequest.populate("requester", "username email avatar")

            return NextResponse.json({
                message: "Friend request accepted",
                friend: {
                    id: friendRequest.requester._id,
                    username: friendRequest.requester.username,
                    email: friendRequest.requester.email,
                    avatar: friendRequest.requester.avatar,
                    friendshipId: friendRequest._id,
                },
            })
        } else if (action === "reject") {
            await Friend.findByIdAndDelete(friendRequestId)
            return NextResponse.json({ message: "Friend request rejected" })
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 })
        }
    } catch (error) {
        console.error("Friend request action error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}