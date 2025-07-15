import mongoose from "mongoose"

const FriendSchema = new mongoose.Schema(
    {
        requester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "blocked"],
            default: "pending",
        },
    },
    {
        timestamps: true,
    },
)

FriendSchema.index({ requester: 1, recipient: 1 }, { unique: true })

export default mongoose.models.Friend || mongoose.model("Friend", FriendSchema)
