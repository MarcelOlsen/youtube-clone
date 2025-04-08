# YouTube Clone

A modern, full-featured YouTube clone built with Next.js, featuring video upload, playback, user authentication, and more.

## 🚀 Tech Stack

### Frontend

- **Next.js 15** - React framework for server-side rendering and static site generation
- **React 19** - UI library for building user interfaces
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Unstyled, accessible components
- **tRPC** - End-to-end typesafe APIs
- **React Query** - Data fetching and state management
- **Zod** - TypeScript-first schema validation

### Backend

- **tRPC** - Type-safe API layer
- **Drizzle ORM** - TypeScript ORM for database operations
- **Neon Database** - Serverless Postgres database
- **Upstash Redis** - Serverless Redis for caching and rate limiting

### Authentication & Storage

- **Clerk** - Authentication and user management
- **UploadThing** - File upload service
- **Mux** - Video streaming and processing

### Development Tools

- **TypeScript** - Static type checking
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Bun** - Fast JavaScript runtime and package manager

## ✨ Features

### Video Management

- 📹 Video upload with progress tracking and Mux integration
- 🎥 Video playback using Mux player
- 🏷️ Video categorization with categories
- 📝 Video descriptions and titles
- 🔄 Video processing status tracking
- 🖼️ Custom thumbnail upload and generation
- 🔒 Video visibility settings (public/private)

### User Features

- 🔐 Authentication with Clerk
- 👤 User profiles
- 👍 Video reactions (likes/dislikes)
- 💬 Comment system
- 📢 Channel subscriptions
- 📊 View count tracking

### Content Organization

- 📋 Playlist creation and management
- 🔍 Search functionality with filters
- 🏷️ Category-based browsing

### Technical Features

- ⚡ Real-time video processing with Mux
- 🔒 Secure file uploads with UploadThing
- 📦 Optimized video delivery with Mux CDN
- 🛡️ Rate limiting with Upstash Redis

## 🛠️ Project Structure

```
src/
├── app/           # Next.js app router pages
├── components/    # Reusable UI components
├── db/           # Database schema and migrations
├── hooks/        # Custom React hooks
├── lib/          # Utility functions and configurations
├── modules/      # Feature-specific modules
├── scripts/      # Development and build scripts
└── trpc/         # tRPC router and procedures
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Clerk account for authentication
- A Mux account for video processing
- A Neon Database instance
- An Upstash Redis instance

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/youtube-clone.git
cd youtube-clone
```

2. Install dependencies:

```bash
bun install
```

3. Set up environment variables:
   Create a `.env.local` file with the following variables:

```env
DATABASE_URL=your_neon_database_url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
UPLOADTHING_SECRET=your_uploadthing_secret
UPLOADTHING_APP_ID=your_uploadthing_app_id
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

4. Run database migrations:

```bash
bun run db:migrate
```

5. Start the development server:

```bash
bun run dev
```

## 🧪 Development

- `bun run dev` - Start the development server
- `bun run dev:all` - Start development server with webhook support
- `bun run build` - Build the application for production
- `bun run start` - Start the production server
- `bun run lint` - Run ESLint

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Clerk](https://clerk.com/)
- [Mux](https://mux.com/)
- [tRPC](https://trpc.io/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Radix UI](https://www.radix-ui.com/)
