import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import { signToken } from "@/lib/jwt"

export async function POST(request: NextRequest) {
    try {
        await dbConnect()

        const { email, password } = await request.json()

        // Validate input
        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
        }

        // Find user
        const user = await User.findOne({ email })
        if (!user) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
        }

        // Update user online status
        await User.findByIdAndUpdate(user._id, {
            isOnline: true,
            lastSeen: new Date(),
        })

        // Generate JWT token
        const token = signToken({
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
        })

        return NextResponse.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                isOnline: user.isOnline,
            },
        })
    } catch (error) {
        console.error("Login error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
