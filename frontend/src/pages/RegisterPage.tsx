import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Activity, Loader2, Lock, Mail, User, UserCheck, Eye, EyeOff } from "lucide-react";
import api from '../services/api';
import medicalBg from '@/assets/medical-bg.jpg';
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import DNABackground from '@/components/DNABackground';

gsap.registerPlugin(useGSAP);

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });

    gsap.set([".logo-anim", ".header-anim", ".form-anim"], { 
      autoAlpha: 0, 
      y: 30,
      rotationX: -15,
      transformPerspective: 1000
    });

    tl.to(".logo-anim", { autoAlpha: 1, y: 0, rotationX: 0, stagger: 0.2 })
      .to(".header-anim", { autoAlpha: 1, y: 0, rotationX: 0, stagger: 0.2 }, "-=0.4")
      .to(".form-anim", { autoAlpha: 1, y: 0, rotationX: 0, stagger: 0.1 }, "-=0.4");

    const card = document.querySelector(".form-card-anim");
    if (card) {
      card.addEventListener("mousemove", (e: any) => {
        const { clientX, clientY } = e;
        const { left, top, width, height } = card.getBoundingClientRect();
        const x = (clientX - left) / width - 0.5;
        const y = (clientY - top) / height - 0.5;
        gsap.to(card, { rotationY: x * 10, rotationX: -y * 10, duration: 0.5, ease: "power2.out" });
      });
      card.addEventListener("mouseleave", () => {
        gsap.to(card, { rotationY: 0, rotationX: 0, duration: 0.5, ease: "power2.out" });
      });
    }
  }, { scope: containerRef });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/register', {
        username,
        email,
        full_name: fullName,
        password
      });
      
      toast({
        title: "Account created!",
        description: "You can now log in with your credentials.",
      });
      navigate('/login');
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: err.response?.data?.detail || "An error occurred during registration.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen relative flex overflow-hidden bg-[#020817]">
      {/* 3D DNA Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
        <DNABackground />
      </div>

      <div className="relative z-10 w-full flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-7">
          {/* Logo */}
          <div className="logo-anim flex items-center gap-3 mb-2 justify-center">
            <div className="w-12 h-12 rounded-2xl gradient-medical-btn flex items-center justify-center pulse-glow">
              <Activity className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-2xl font-bold text-primary-foreground block" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                SvasthaAI
              </span>
              <span className="text-xs text-primary-foreground/50">Create an Account</span>
            </div>
          </div>

          <div className="header-anim space-y-1 text-center">
            <h2 className="text-3xl font-bold text-primary-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Join SvasthaAI
            </h2>
            <p className="text-primary-foreground/60 text-sm">Monitor your health with AI-powered diagnostics</p>
          </div>

          <Card className="form-anim form-card-anim border-0 shadow-2xl" style={{ background: 'hsla(0,0%,100%,0.08)', backdropFilter: 'blur(24px)', border: '1px solid hsla(168,40%,60%,0.15)' }}>
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4 pt-6">
                <div className="form-anim space-y-2">
                  <Label htmlFor="fullName" className="text-primary-foreground/80 font-medium text-sm">Full Name</Label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/40" />
                    <Input
                      id="fullName"
                      placeholder="Enter your full name"
                      className="pl-10 h-12 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                      style={{ background: 'hsla(0,0%,100%,0.06)' }}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-anim space-y-2">
                  <Label htmlFor="username" className="text-primary-foreground/80 font-medium text-sm">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/40" />
                    <Input
                      id="username"
                      placeholder="Enter your username"
                      className="pl-10 h-12 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                      style={{ background: 'hsla(0,0%,100%,0.06)' }}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-anim space-y-2">
                  <Label htmlFor="email" className="text-primary-foreground/80 font-medium text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/40" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10 h-12 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                      style={{ background: 'hsla(0,0%,100%,0.06)' }}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-anim space-y-2">
                  <Label htmlFor="password" className="text-primary-foreground/80 font-medium text-sm">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/40" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      className="pl-10 pr-10 h-12 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                      style={{ background: 'hsla(0,0%,100%,0.06)' }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-foreground/40 hover:text-primary-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="form-anim flex flex-col gap-4 pb-6">
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold gradient-medical-btn text-primary-foreground hover:opacity-90 transition-all duration-300 pulse-glow hover:scale-[1.02] active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign Up"}
                </Button>

                <p className="text-sm text-center text-primary-foreground/50">
                  Already have an account?{" "}
                  <Link to="/login" className="font-semibold text-accent hover:text-primary-foreground transition-colors">
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>

          <p className="logo-anim text-xs text-primary-foreground/30 text-center">© 2026 SvasthaAI. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
