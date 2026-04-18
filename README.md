# Better SaaS

[中文版 README](README_zh.md) | English

A modern, full-stack SaaS application built with Next.js 15, featuring authentication, payments, file management, and internationalization with comprehensive testing suite.

## 🚀 Features

- **🔐 Authentication**: Email/password and social login (GitHub, Google) with Better Auth
- **💳 Payments**: Stripe integration with subscription management and billing dashboard
- **🪙 Credits System**: Flexible quota management for API usage and storage with automated billing
- **📁 File Management**: Upload, preview, and manage files with AWS S3/R2 storage
- **🌍 Internationalization**: Multi-language support (English/Chinese) with next-intl
- **📱 Responsive Design**: Modern UI with Radix UI and Tailwind CSS v4
- **📖 Documentation**: Built-in documentation system with Fumadocs
- **🔒 Protected Routes**: Role-based access control and route protection
- **👥 Admin Dashboard**: User management and system administration
- **⚡ Performance**: Optimized with Next.js 15 App Router and Turbo mode
- **🧪 Testing**: Comprehensive testing suite with Jest, Playwright, and integration tests

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 15 (App Router)
- **UI Components**: Radix UI + Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: SWR
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React

### Backend

- **Runtime**: Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth
- **Payments**: Stripe
- **File Storage**: AWS S3/Cloudflare R2
- **Validation**: Zod

### Development & Testing

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Code Quality**: Biome (formatting, linting)
- **Environment**: @t3-oss/env-nextjs
- **Unit Testing**: Jest with React Testing Library
- **Integration Testing**: Jest with database integration
- **E2E Testing**: Playwright with multi-browser support
- **Test Coverage**: Comprehensive coverage reporting

## 📖 Documentation

Complete project documentation has been migrated to our online documentation site:

**🌐 [https://www.better-saas.org/docs](https://www.better-saas.org/docs)**

The online documentation includes:

- 🏗️ Architecture design and system overview
- 📦 Detailed installation and configuration guide
- 🔧 API documentation with examples
- 🎨 UI component library usage guide
- 🧪 Testing strategies and best practices
- 🚀 Deployment guide and production setup
- 🌍 Internationalization implementation
- 💳 Payment integration and subscription management
- 🪙 Credits system configuration and usage patterns

> 💡 **Tip**: The online documentation is continuously updated. We recommend bookmarking it for the latest information.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database
- Stripe account (for payments)
- AWS S3 or Cloudflare R2 (for file storage)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd better-saas
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env
   ```

   Fill in the required environment variables:

   - `DATABASE_URL`: PostgreSQL connection string
   - `BETTER_AUTH_SECRET`: Random secret for authentication
   - `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`: GitHub OAuth app credentials
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Google OAuth app credentials
   - `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`: Stripe API keys
   - `NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY` & `NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY`: Stripe price IDs
   - `R2_*`: Cloudflare R2 or AWS S3 configuration
   - `NEXT_PUBLIC_APP_URL`: Your app's URL
   - `ADMIN_EMAILS`: Comma-separated list of admin email addresses

4. **Set up the database**

   ```bash
   pnpm db:push
   ```

5. **Configure credits system (optional)**

   Customize credits allocation and pricing in:
   - `/src/config/credits.config.ts` - API costs and quotas
   - `/src/config/payment.config.ts` - Subscription plan credits

6. **Start the development server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.




The application supports multiple languages:

- English (default)
- Chinese (Simplified)

Language files are located in `src/i18n/messages/`.



## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for new features
5. Run tests and quality checks:
   ```bash
   pnpm test:all
   pnpm check
   pnpm typecheck
   ```
6. Ensure all tests pass and coverage thresholds are met
7. Submit a pull request


## 📄 License

This project is licensed under the MIT License.


## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=justnode/better-saas&type=Date)](https://www.star-history.com/#justnode/better-saas&Date)
