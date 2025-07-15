import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import { signToken } from "@/lib/jwt"

export async function POST(request: NextRequest) {
    try {
        await dbConnect()

        const { username, email, password } = await request.json()

        // Validate input
        if (!username || !email || !password) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 })
        }

        if (password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }],
        })

        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 })
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12)

        // Create user
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
        })

        // Generate JWT token
        const token = signToken({
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
        })

        return NextResponse.json({
            message: "User created successfully",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
            },
        })
    } catch (error) {
        console.error("Registration error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
