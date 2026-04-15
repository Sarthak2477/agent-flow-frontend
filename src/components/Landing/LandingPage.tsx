import './landing.css';
import { useState, useEffect, useRef } from 'react';
import {
    Bot, Rocket, Github, Terminal, Zap, Shield, Globe,
    ArrowRight, ChevronRight, Check, Cpu, Activity,
    Code2, Layers, BarChart3, Clock, Star, Menu, X
} from 'lucide-react';

/* ─── tiny hook: intersection observer ─── */
function useInView(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
            { threshold }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return { ref, inView };
}

/* ─── animated counter ─── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
    const [count, setCount] = useState(0);
    const { ref, inView } = useInView();
    useEffect(() => {
        if (!inView) return;
        let start = 0;
        const end = target;
        const step = end / 60;
        const timer = setInterval(() => {
            start += step;
            if (start >= end) { setCount(end); clearInterval(timer); }
            else setCount(Math.floor(start));
        }, 16);
        return () => clearInterval(timer);
    }, [inView, target]);
    return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─── animated terminal ─── */
const TERMINAL_LINES = [
    { delay: 0, color: '#666', text: '$ agentctl deploy my-research-agent' },
    { delay: 600, color: '#22c55e', text: '✓ Image validated: sha256:a1b2c3d4...' },
    { delay: 1200, color: '#60a5fa', text: '→ Scheduling pod on k8s cluster...' },
    { delay: 1800, color: '#60a5fa', text: '→ Injecting environment secrets...' },
    { delay: 2400, color: '#22c55e', text: '✓ Health-check passed (200 OK)' },
    { delay: 3000, color: '#fff', text: '🚀 Agent live at https://agent.cluster.io/my-research' },
];

function AnimatedTerminal() {
    const [visibleLines, setVisibleLines] = useState<number[]>([]);
    const { ref, inView } = useInView(0.3);

    useEffect(() => {
        if (!inView) return;
        TERMINAL_LINES.forEach((line, i) => {
            setTimeout(() => setVisibleLines(prev => [...prev, i]), line.delay);
        });
    }, [inView]);

    return (
        <div
            ref={ref}
            className="lp-terminal"
            aria-label="Deployment terminal demo"
        >
            <div className="lp-terminal-bar">
                <span className="lp-dot lp-dot-red" />
                <span className="lp-dot lp-dot-yellow" />
                <span className="lp-dot lp-dot-green" />
                <span className="lp-terminal-title">deployment.log</span>
            </div>
            <div className="lp-terminal-body">
                {TERMINAL_LINES.map((line, i) => (
                    <div
                        key={i}
                        className="lp-terminal-line"
                        style={{
                            opacity: visibleLines.includes(i) ? 1 : 0,
                            transform: visibleLines.includes(i) ? 'translateY(0)' : 'translateY(6px)',
                            transition: 'opacity 0.4s ease, transform 0.4s ease',
                            color: line.color,
                        }}
                    >
                        {line.text}
                    </div>
                ))}
                {visibleLines.length === TERMINAL_LINES.length && (
                    <span className="lp-cursor" />
                )}
            </div>
        </div>
    );
}

/* ─── feature card ─── */
function FeatureCard({
    icon: Icon, title, description, delay = 0,
}: { icon: React.ElementType; title: string; description: string; delay?: number }) {
    const { ref, inView } = useInView();
    return (
        <div
            ref={ref}
            className="lp-feature-card"
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
            }}
        >
            <div className="lp-feature-icon">
                <Icon size={18} />
            </div>
            <h3 className="lp-feature-title">{title}</h3>
            <p className="lp-feature-desc">{description}</p>
        </div>
    );
}

/* ─── pricing card ─── */
function PricingCard({
    plan, price, description, features, highlighted = false, delay = 0,
}: {
    plan: string; price: string; description: string;
    features: string[]; highlighted?: boolean; delay?: number;
}) {
    const { ref, inView } = useInView();
    return (
        <div
            ref={ref}
            className={`lp-pricing-card ${highlighted ? 'lp-pricing-highlight' : ''}`}
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
            }}
        >
            {highlighted && <div className="lp-pricing-badge">Most Popular</div>}
            <div className="lp-pricing-plan">{plan}</div>
            <div className="lp-pricing-price">
                {price}
                {price !== 'Custom' && <span className="lp-pricing-period">/mo</span>}
            </div>
            <p className="lp-pricing-desc">{description}</p>
            <ul className="lp-pricing-features">
                {features.map((f) => (
                    <li key={f} className="lp-pricing-feature">
                        <Check size={13} className="lp-check" />
                        {f}
                    </li>
                ))}
            </ul>
            <button className={highlighted ? 'lp-btn-primary lp-btn-full' : 'lp-btn-secondary lp-btn-full'}>
                Get Started <ArrowRight size={14} />
            </button>
        </div>
    );
}

/* ─── stat card ─── */
function StatCard({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
    return (
        <div className="lp-stat">
            <div className="lp-stat-value">
                <Counter target={value} suffix={suffix} />
            </div>
            <div className="lp-stat-label">{label}</div>
        </div>
    );
}

/* ─── main component ─── */
export function LandingPage({ onGetStarted }: { onGetStarted?: () => void }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="lp-root">
            {/* ── Navbar ── */}
            <nav className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''}`}>
                <div className="lp-nav-inner">
                    <a href="#" className="lp-logo">
                        <div className="lp-logo-icon"><Bot size={16} /></div>
                        <span>Agentix</span>
                    </a>
                    <div className="lp-nav-links">
                        <a href="#features" className="lp-nav-link">Features</a>
                        <a href="#how-it-works" className="lp-nav-link">How it works</a>
                        <a href="#pricing" className="lp-nav-link">Pricing</a>
                        <a href="#testimonials" className="lp-nav-link">Customers</a>
                    </div>
                    <div className="lp-nav-actions">
                        <button className="lp-btn-ghost" onClick={onGetStarted}>Sign in</button>
                        <button className="lp-btn-primary" onClick={onGetStarted}>
                            Get started <ArrowRight size={14} />
                        </button>
                    </div>
                    <button className="lp-hamburger" onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu">
                        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
                {mobileOpen && (
                    <div className="lp-mobile-menu">
                        <a href="#features" className="lp-mobile-link" onClick={() => setMobileOpen(false)}>Features</a>
                        <a href="#how-it-works" className="lp-mobile-link" onClick={() => setMobileOpen(false)}>How it works</a>
                        <a href="#pricing" className="lp-mobile-link" onClick={() => setMobileOpen(false)}>Pricing</a>
                        <a href="#testimonials" className="lp-mobile-link" onClick={() => setMobileOpen(false)}>Customers</a>
                        <button className="lp-btn-primary lp-btn-full" onClick={onGetStarted}>Get started</button>
                    </div>
                )}
            </nav>

            {/* ── Hero ── */}
            <section className="lp-hero">
                {/* background grid */}
                <div className="lp-grid-bg" aria-hidden />
                {/* glow blobs */}
                <div className="lp-blob lp-blob-1" aria-hidden />
                <div className="lp-blob lp-blob-2" aria-hidden />

                <div className="lp-hero-inner">
                    <div className="lp-hero-badge">
                        <span className="lp-badge-dot" />
                        Now with Kubernetes Jobs & CronJob support
                        <ChevronRight size={12} />
                    </div>

                    <h1 className="lp-hero-headline">
                        Deploy AI Agents<br />
                        <span className="lp-gradient-text">at production scale.</span>
                    </h1>

                    <p className="lp-hero-sub">
                        The platform built for teams shipping real AI. Connect your GitHub repo,
                        configure secrets, and launch agents on Kubernetes in seconds—not days.
                    </p>

                    <div className="lp-hero-actions">
                        <button className="lp-btn-primary lp-btn-lg" onClick={onGetStarted}>
                            Start deploying free <ArrowRight size={16} />
                        </button>
                        <a href="#how-it-works" className="lp-btn-ghost lp-btn-lg">
                            <Terminal size={15} /> Watch demo
                        </a>
                    </div>

                    <div className="lp-hero-trust">
                        <span className="lp-trust-label">Trusted by teams at</span>
                        {['OpenRouter', 'Groq', 'Anthropic', 'LangChain'].map(name => (
                            <span key={name} className="lp-trust-logo">{name}</span>
                        ))}
                    </div>
                </div>

                {/* terminal preview */}
                <div className="lp-hero-terminal-wrap">
                    <AnimatedTerminal />
                </div>
            </section>

            {/* ── Stats ── */}
            <section className="lp-stats-section">
                <div className="lp-section-inner">
                    <div className="lp-stats-grid">
                        <StatCard value={12000} suffix="+" label="Agents deployed" />
                        <StatCard value={99} suffix="%" label="Uptime SLA" />
                        <StatCard value={340} suffix="ms" label="Avg. cold start" />
                        <StatCard value={500} suffix="+" label="Teams worldwide" />
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section id="features" className="lp-section">
                <div className="lp-section-inner">
                    <div className="lp-section-header">
                        <div className="lp-eyebrow">Platform Features</div>
                        <h2 className="lp-section-title">Everything your AI needs to go live</h2>
                        <p className="lp-section-sub">
                            From development to production, Agentix handles the hard infrastructure
                            so your team can focus on building great agents.
                        </p>
                    </div>
                    <div className="lp-features-grid">
                        <FeatureCard delay={0} icon={Rocket} title="One-click deploys" description="Push to GitHub and deploy instantly. No YAML, no kubectl, no DevOps PhD required." />
                        <FeatureCard delay={60} icon={Shield} title="Secret injection" description="Pass API keys and environment variables securely at deploy time. Encrypted at rest." />
                        <FeatureCard delay={120} icon={Activity} title="Live observability" description="Real-time log streaming, health checks, and token-level cost metering built in." />
                        <FeatureCard delay={180} icon={Github} title="GitHub integration" description="Connect any repo and trigger deployments via webhooks or the dashboard." />
                        <FeatureCard delay={240} icon={Cpu} title="Kubernetes native" description="Runs on your own cluster. Deployments, Jobs, and CronJobs—choose your model." />
                        <FeatureCard delay={300} icon={BarChart3} title="Cost guardrails" description="Set daily spend limits and kill switches. Never get surprised by runaway agents again." />
                        <FeatureCard delay={360} icon={Clock} title="Scheduled jobs" description="Run agents on a cron schedule or trigger on-demand with a single API call." />
                        <FeatureCard delay={420} icon={Globe} title="Multi-provider LLMs" description="Works with OpenAI, Anthropic, Groq, and any OpenAI-compatible endpoint." />
                        <FeatureCard delay={480} icon={Code2} title="REST API" description="Automate everything programmatically. Full API access included on all plans." />
                    </div>
                </div>
            </section>

            {/* ── How it works ── */}
            <section id="how-it-works" className="lp-section lp-section-alt">
                <div className="lp-section-inner">
                    <div className="lp-section-header">
                        <div className="lp-eyebrow">How It Works</div>
                        <h2 className="lp-section-title">From repo to running agent in 3 steps</h2>
                    </div>
                    <div className="lp-steps">
                        {[
                            {
                                step: '01',
                                icon: Github,
                                title: 'Connect your repository',
                                body: 'Link any GitHub repo to an agent in one click. We detect your Dockerfile automatically.',
                            },
                            {
                                step: '02',
                                icon: Layers,
                                title: 'Configure & deploy',
                                body: 'Inject secrets, choose your execution mode (service, job, or cron), and hit deploy.',
                            },
                            {
                                step: '03',
                                icon: Zap,
                                title: 'Monitor in real-time',
                                body: 'Watch logs stream live, track health, and view token usage—all in one dashboard.',
                            },
                        ].map(({ step, icon: Icon, title, body }, i) => {
                            const { ref, inView } = useInView();
                            return (
                                <div
                                    key={step}
                                    ref={ref}
                                    className="lp-step"
                                    style={{
                                        opacity: inView ? 1 : 0,
                                        transform: inView ? 'translateX(0)' : 'translateX(-20px)',
                                        transition: `opacity 0.5s ease ${i * 120}ms, transform 0.5s ease ${i * 120}ms`,
                                    }}
                                >
                                    <div className="lp-step-num">{step}</div>
                                    <div className="lp-step-body">
                                        <div className="lp-step-icon-wrap">
                                            <Icon size={16} />
                                        </div>
                                        <h3 className="lp-step-title">{title}</h3>
                                        <p className="lp-step-desc">{body}</p>
                                    </div>
                                    {i < 2 && <div className="lp-step-connector" aria-hidden />}
                                </div>
                            );
                        })}
                    </div>

                    {/* terminal demo */}
                    <div className="lp-terminal-section">
                        <AnimatedTerminal />
                    </div>
                </div>
            </section>

            {/* ── Testimonials ── */}
            <section id="testimonials" className="lp-section">
                <div className="lp-section-inner">
                    <div className="lp-section-header">
                        <div className="lp-eyebrow">Customer Stories</div>
                        <h2 className="lp-section-title">Loved by teams shipping AI</h2>
                    </div>
                    <div className="lp-testimonials-grid">
                        {[
                            {
                                quote: "We went from a 2-day Kubernetes deployment process to under 5 minutes. Agentix is the missing DevOps layer for AI teams.",
                                name: "Sarah Chen",
                                role: "CTO, Arca AI",
                                stars: 5,
                            },
                            {
                                quote: "The cost guardrails alone saved us from a $4,000 runaway agent incident. Now we sleep soundly at night.",
                                name: "Marcus Webb",
                                role: "ML Eng, DataForge",
                                stars: 5,
                            },
                            {
                                quote: "Spinning up a nightly research agent with CronJob support took 10 minutes. Absolutely brilliant product.",
                                name: "Priya Nair",
                                role: "Lead Engineer, Synthex",
                                stars: 5,
                            },
                        ].map(({ quote, name, role, stars }, i) => {
                            const { ref, inView } = useInView();
                            return (
                                <div
                                    key={name}
                                    ref={ref}
                                    className="lp-testimonial"
                                    style={{
                                        opacity: inView ? 1 : 0,
                                        transform: inView ? 'translateY(0)' : 'translateY(20px)',
                                        transition: `opacity 0.5s ease ${i * 100}ms, transform 0.5s ease ${i * 100}ms`,
                                    }}
                                >
                                    <div className="lp-stars">
                                        {Array.from({ length: stars }).map((_, j) => (
                                            <Star key={j} size={12} className="lp-star" />
                                        ))}
                                    </div>
                                    <p className="lp-quote">"{quote}"</p>
                                    <div className="lp-testimonial-author">
                                        <div className="lp-avatar">{name[0]}</div>
                                        <div>
                                            <div className="lp-author-name">{name}</div>
                                            <div className="lp-author-role">{role}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── Pricing ── */}
            <section id="pricing" className="lp-section lp-section-alt">
                <div className="lp-section-inner">
                    <div className="lp-section-header">
                        <div className="lp-eyebrow">Pricing</div>
                        <h2 className="lp-section-title">Simple, transparent pricing</h2>
                        <p className="lp-section-sub">Start free. Scale when you're ready. No hidden fees.</p>
                    </div>
                    <div className="lp-pricing-grid">
                        <PricingCard
                            delay={0}
                            plan="Hobby"
                            price="$0"
                            description="Perfect for solo builders and side projects."
                            features={['3 agents', '5 GB storage', 'Community support', 'GitHub integration', 'Basic observability']}
                        />
                        <PricingCard
                            delay={80}
                            plan="Pro"
                            price="$49"
                            description="For serious teams shipping real AI products."
                            features={['Unlimited agents', '50 GB storage', 'Priority support', 'Cost guardrails', 'CronJob scheduler', 'Full API access', 'Multi-LLM routing']}
                            highlighted
                        />
                        <PricingCard
                            delay={160}
                            plan="Enterprise"
                            price="Custom"
                            description="For orgs with advanced compliance and scale needs."
                            features={['Bring your own cluster', 'SSO / SAML', 'SLA guarantee', 'Dedicated support', 'Audit logs', 'Custom integrations']}
                        />
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="lp-cta-section">
                <div className="lp-blob lp-blob-cta" aria-hidden />
                <div className="lp-cta-inner">
                    <h2 className="lp-cta-title">Ready to deploy your first agent?</h2>
                    <p className="lp-cta-sub">Join 500+ teams running AI at scale on Agentix.</p>
                    <div className="lp-cta-actions">
                        <button className="lp-btn-primary lp-btn-lg" onClick={onGetStarted}>
                            Get started for free <ArrowRight size={16} />
                        </button>
                        <a href="mailto:hello@agentix.dev" className="lp-btn-ghost lp-btn-lg">
                            Talk to sales
                        </a>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="lp-footer">
                <div className="lp-footer-inner">
                    <div className="lp-footer-brand">
                        <a href="#" className="lp-logo">
                            <div className="lp-logo-icon"><Bot size={14} /></div>
                            <span>Agentix</span>
                        </a>
                        <p className="lp-footer-tagline">Deploy AI agents at production scale.</p>
                    </div>
                    <div className="lp-footer-cols">
                        <div className="lp-footer-col">
                            <div className="lp-footer-col-title">Product</div>
                            <a href="#" className="lp-footer-link">Features</a>
                            <a href="#" className="lp-footer-link">Pricing</a>
                            <a href="#" className="lp-footer-link">Changelog</a>
                            <a href="#" className="lp-footer-link">Roadmap</a>
                        </div>
                        <div className="lp-footer-col">
                            <div className="lp-footer-col-title">Developers</div>
                            <a href="#" className="lp-footer-link">Documentation</a>
                            <a href="#" className="lp-footer-link">API Reference</a>
                            <a href="#" className="lp-footer-link">GitHub</a>
                            <a href="#" className="lp-footer-link">Status</a>
                        </div>
                        <div className="lp-footer-col">
                            <div className="lp-footer-col-title">Company</div>
                            <a href="#" className="lp-footer-link">About</a>
                            <a href="#" className="lp-footer-link">Blog</a>
                            <a href="#" className="lp-footer-link">Careers</a>
                            <a href="#" className="lp-footer-link">Contact</a>
                        </div>
                    </div>
                </div>
                <div className="lp-footer-bottom">
                    <span>© 2026 Agentix, Inc. All rights reserved.</span>
                    <div className="lp-footer-legal">
                        <a href="#" className="lp-footer-link-sm">Privacy</a>
                        <a href="#" className="lp-footer-link-sm">Terms</a>
                        <a href="#" className="lp-footer-link-sm">Security</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
