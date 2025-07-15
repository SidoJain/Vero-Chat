# Vero Chat

**Vero Chat** is a modern, real-time chat application built with Next.js, Socket.IO, and MongoDB. It’s designed for instant messaging, sleek UI, and responsive performance — whether you’re building a personal messenger or scaling a team communication tool.

---

## 🚀 Features

- ⚡ Real-time messaging using WebSockets (Socket.IO)
- 🧑‍🤝‍🧑 User authentication & friend system
- 🗂️ Chat history with MongoDB persistence
- 🖥️ Responsive and mobile-friendly UI (TailwindCSS)
- 🟢 Online status indicators
- 🔔 Notifications for new messages

---

## 🛠️ Tech Stack

- **Frontend**: React, Next.js, TailwindCSS
- **Backend**: Node.js, Socket.IO, MongoDB (via Mongoose)
- **Auth**: JWT
- **Deployment**: Render

---

## 📦 Installation

1. **Clone the repository:**

    ```bash
    git clone https://github.com/SidoJain/Vero-Chat.git
    cd vero-chat
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Set up environment variables:**  

    Create a `.env.local` file and configure:

    ```bash
    MONGODB_URI=your_mongodb_connection_string
    JWT_SECRET=some_jwt_secret
    ```

4. **Run the app:**

    ```bash
    npm run dev
    ```

## Live Demo

It may take a minute to start.  
[https://vero-chat.onrender.com/](https://vero-chat.onrender.com/)

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
