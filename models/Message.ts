import mongoose from "mongoose"

const MessageSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        conversationId: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ["text", "image", "file"],
            default: "text",
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    },
)

MessageSchema.index({ conversationId: 1, createdAt: 1 })

export default mongoose.models.Message || mongoose.model("Message", MessageSchema)
