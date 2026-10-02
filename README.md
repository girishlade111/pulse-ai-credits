# Pulse AI Credits - AI-Powered Intelligence SaaS Platform

> **Transform your workflow with our comprehensive suite of AI-driven tools designed to solve complex challenges with varying levels of depth and sophistication.**

![Pulse AI](https://img.shields.io/badge/Pulse%20AI-Credits%20SaaS-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.2-3178C6?style=flat&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.4.2-646CFF?style=flat&logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat&logo=supabase)

## 🚀 Overview

Pulse AI Credits is a modern SaaS platform that provides access to 7 specialized AI tools through a flexible credit-based system. From instant answers to comprehensive research datasets, each feature is engineered for specific use cases and optimized for maximum efficiency.

### ✨ Key Features

- **🔥 7 Specialized AI Tools** - From quick searches to comprehensive research
- **⚡ Credit-Based System** - Pay only for what you use (1-40 credits per request)
- **🎯 Response Times** - 5 seconds to 60 minutes depending on complexity
- **💳 Flexible Pricing** - Free tier with premium plans and top-ups
- **🔄 Real-time Updates** - Instant credit tracking and transaction history
- **📱 Responsive Design** - Works seamlessly across all devices

## 🛠️ AI Tools & Specifications

### Essential AI Tools (Basic Features)

| Tool | Credits | Response Time | Type | Description |
|------|---------|---------------|------|-------------|
| **Quick Search** | 1 | 10-30 seconds | Synchronous | Ask anything in your mind - instant AI-powered answers |
| **Deep Research** | 2 | 30 sec - 1 min | Synchronous | Research on any topic with comprehensive analysis |
| **Generate Image** | 1 | 10-30 seconds | Synchronous | Create any image from your imagination |

### Advanced AI Solutions (Professional Features)

| Tool | Credits | Response Time | Type | Description |
|------|---------|---------------|------|-------------|
| **Pro Search** | 3 | < 5 seconds | Synchronous | Ranked web URLs with long, relevant content for AI agents |
| **Task** | 10 | 10 sec - 30 min | Asynchronous | Enrich entities with optimized quality & freshness |
| **8x Deep Research** | 40 | 4-30 minutes | Asynchronous | Research anything deeply with structured outputs |
| **Find All** | 40 | 5-60 minutes | Asynchronous | Build comprehensive datasets from the web |

## 💰 Pricing Plans

### 🎁 Free Plan
| Feature | Details |
|---------|----------|
| **Price** | ₹0 / month |
| **Credits** | 10 (one-time only, no monthly reset) |
| **Top-ups** | ❌ Not available |
| **Usage** | Trial use only |

### 💳 Paid Plans (Monthly & Annual Options)

#### Monthly Plans
| Plan | Base Credits | Bonus Credits | Total | Price (INR) | Top-up Discount |
|------|-------------|---------------|-------|-------------|------------------|
| **Starter** | 30 | +30 | 60 | ₹499/month | None (full price) |
| **Pro** | 60 | +60 | 120 | ₹999/month | 10% OFF |
| **Business** | 200 | +200 | 400 | ₹3,000/month | 20% OFF |

#### Annual Plans (Save up to 16.67%)
| Plan | Base Credits | Bonus Credits | Total | Annual Price | Monthly Equivalent | You Save |
|------|-------------|---------------|-------|--------------|-------------------|----------|
| **Starter** | 30 | +30 | 60 | ₹5,499/year | ~₹458/month | 8.17% (₹489) |
| **Pro** | 60 | +60 | 120 | ₹9,999/year | ~₹833/month | 16.59% (₹1,989) |
| **Business** | 200 | +200 | 400 | ₹29,999/year | ~₹2,500/month | 16.67% (₹6,001) |

### 🔋 Top-Up Pricing (Available only for Paid Users)

| Credits | Starter Price | Pro Price (10% OFF) | Business Price (20% OFF) |
|---------|---------------|---------------------|-------------------------|
| **10 Credits** | ₹149 | ₹134 | ₹119 |
| **20 Credits** | ₹249 | ₹224 | ₹199 |
| **30 Credits** | ₹349 | ₹314 | ₹279 |
| **50 Credits** | ₹499 | ₹449 | ₹399 |

### 📌 Key Rules
1. **Free users cannot purchase credits** ❌
2. **Paid plan required** before buying any top-ups ✅
3. **Starter users** buy credits at full price
4. **Pro users** get 10% discount on top-ups
5. **Business users** get 20% discount on top-ups
6. **Credits consumed per task** (1-40 depending on complexity)
7. **Annual plans** offer significant savings (8.17% - 16.67%)
8. **Billing flexibility** - Switch between monthly and annual at any time

### 🔄 Additional Features
- **Monthly/Annual Billing** - Choose the billing cycle that works for you
- **Annual Savings** - Save up to 16.67% with annual subscriptions
- **Monthly Credit Reset** - Paid plans get fresh credits every month
- **Bonus Credits** - All paid plans include 100% bonus credits
- **Stripe Integration** - Secure payment processing with INR support
- **Real-time Tracking** - Monitor credit usage and transaction history
- **User Roles** - Free and Paid user categories with appropriate permissions

## 🏗️ Technical Architecture

### Frontend Stack
- **React 18.3.1** - Modern React with hooks and context
- **TypeScript 5.5.2** - Type-safe development
- **Vite 5.4.2** - Lightning-fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icon library

### Backend & Database
- **Supabase** - Backend-as-a-Service with PostgreSQL
- **Authentication** - Secure user management
- **Real-time Database** - Instant updates and synchronization
- **Row Level Security** - Enterprise-grade data protection

### Payment Integration
- **Stripe** - Secure payment processing
- **INR Currency** - Localized pricing for Indian market
- **Webhook Integration** - Automated credit updates

### Database Schema
```sql
-- Core Tables
- profiles: User profile information
- user_credits: Credit balance and transaction tracking
- subscription_plans: Available pricing plans
- credit_transactions: Detailed transaction history
- user_subscriptions: Active user subscriptions
- topup_packages: Credit top-up options

-- Enums
- request_type: image_generation | normal_search | deep_research
- subscription_plan_type: free | starter | pro | business
- transaction_type: deduction | addition | plan_credit | topup
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher) - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **npm** or **yarn** package manager
- **Supabase Account** - For backend services
- **Stripe Account** - For payment processing

### Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd pulse-ai-credits
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create `.env.local` file with required variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   ```

4. **Database Setup**
   - Set up Supabase project
   - Run database migrations
   - Configure Row Level Security policies
   - Set up authentication providers

5. **Start development server**
   ```bash
   npm run dev
   ```
   Access the application at `http://localhost:8080`

### Build for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── layout/         # Layout components (Navbar, etc.)
│   └── SearchInterface.tsx  # Main AI tools interface
├── contexts/           # React context providers
│   └── AuthContext.tsx # Authentication context
├── pages/              # Application pages
│   ├── Features.tsx    # Features documentation page
│   ├── Dashboard.tsx   # User dashboard
│   └── Plans.tsx       # Pricing plans page
├── images/             # Static image assets
│   ├── 1.png          # 8x Deep Research preview
│   ├── 2.png          # Find All preview
│   ├── 3.png          # Pro Search preview
│   └── 4.png          # Task preview
├── integrations/       # External service integrations
│   └── supabase/       # Supabase client and types
├── lib/                # Utility functions
└── hooks/              # Custom React hooks
```

## 🔧 Development Guidelines

### Code Standards
- **TypeScript** - Strict type checking enabled
- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting
- **Component Structure** - Functional components with hooks
- **File Naming** - PascalCase for components, camelCase for utilities

### UI/UX Guidelines
- **Responsive Design** - Mobile-first approach
- **Accessibility** - WCAG 2.1 AA compliance
- **Theme System** - CSS custom properties for theming
- **Component Library** - Consistent use of shadcn/ui components
- **Animation** - Smooth transitions and hover effects

### Database Guidelines
- **Row Level Security** - All tables protected with RLS policies
- **Type Safety** - Generated TypeScript types from Supabase
- **Real-time Updates** - Subscription-based data synchronization
- **Transaction Safety** - Atomic operations for credit management

## 🚀 Deployment

### Production Deployment

1. **Lovable Platform** (Recommended)
   - Visit [Lovable Project](https://lovable.dev/projects/08bf9495-a58f-49ad-a923-d38f6d8e102f)
   - Click Share → Publish
   - Configure custom domain if needed

2. **Manual Deployment**
   - Build the project: `npm run build`
   - Deploy `dist/` folder to your hosting provider
   - Configure environment variables on hosting platform

### Environment Configuration

**Production Environment Variables:**
```env
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_key
VITE_STRIPE_PUBLISHABLE_KEY=your_production_stripe_key
```

## 🔐 Security Features

- **Authentication** - Secure user authentication via Supabase Auth
- **Authorization** - Role-based access control
- **Data Protection** - Row Level Security on all database tables
- **Payment Security** - PCI-compliant payment processing via Stripe
- **API Security** - Rate limiting and request validation
- **Data Encryption** - End-to-end encryption for sensitive data

## 📊 Monitoring & Analytics

- **Credit Usage Tracking** - Real-time credit consumption monitoring
- **Transaction History** - Detailed logs of all credit transactions
- **User Analytics** - Usage patterns and feature adoption
- **Error Tracking** - Comprehensive error logging and reporting
- **Performance Monitoring** - Application performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Workflow

1. **Feature Development**
   - Create feature branch from `main`
   - Implement feature with tests
   - Ensure TypeScript compliance
   - Test across different screen sizes

2. **Testing**
   - Unit tests for business logic
   - Integration tests for API endpoints
   - E2E tests for critical user flows
   - Manual testing on staging environment

3. **Code Review**
   - Peer review required for all PRs
   - Automated checks must pass
   - Documentation updates required

## 📞 Support & Documentation

- **Features Guide** - Visit `/features` page for comprehensive tool documentation
- **API Documentation** - Supabase auto-generated API docs
- **Component Documentation** - shadcn/ui component library
- **Issue Tracking** - GitHub Issues for bug reports and feature requests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **shadcn/ui** - Amazing component library
- **Supabase** - Excellent backend-as-a-service
- **Stripe** - Reliable payment processing
- **Tailwind CSS** - Utility-first CSS framework
- **React Team** - For the amazing React framework

---

**Built with ❤️ by the Pulse AI Team**

*Experience the future of AI-powered solutions with flexible credit-based pricing.*

---

Built by Girish Lade — https://ladestack.in
