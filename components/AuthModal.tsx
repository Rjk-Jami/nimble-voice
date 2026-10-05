"use client";

import React, { useState } from "react";
import { useUIStore, useAuthStore } from "@/stores";
import { useAuthApi } from "@/hooks";
import { MotionModal } from "./motion/MotionModal";
import { MotionButton } from "./motion/MotionButton";
import { TabGlider } from "./motion/TabGlider";
import { LogIn, UserPlus, Sparkles, Mail, Lock, User, ShieldCheck } from "lucide-react";

export function AuthModal() {
  const { isAuthOpen, authMode, closeAuthModal, openAuthModal } = useUIStore();
  const { login, register, guestLogin, isLoading } = useAuthApi();
  const updateUserStore = useAuthStore((s) => s.updateProfile);

  const [activeTab, setActiveTab] = useState<"login" | "register">(authMode || "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    const res: any = await login(email, password);
    if (res?.user) {
      updateUserStore({ ...res.user, isGuest: false });
      closeAuthModal();
      resetForm();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    const res: any = await register(name, email, password);
    if (res?.user) {
      updateUserStore({ ...res.user, isGuest: false });
      closeAuthModal();
      resetForm();
    }
  };

  const handleGuestQuickStart = async () => {
    const res: any = await guestLogin("Learner");
    if (res?.user) {
      updateUserStore(res.user);
      closeAuthModal();
      resetForm();
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
  };

  return (
    <MotionModal
      isOpen={isAuthOpen}
      onClose={closeAuthModal}
      title={activeTab === "login" ? "Welcome Back to NimbleVoice" : "Join NimbleVoice Community"}
      subtitle="Connect with native speakers worldwide across live audio rooms"
      icon={activeTab === "login" ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-5">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-[#161c23] p-1 rounded-xl border border-[#2a3340] relative">
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer relative select-none ${
              activeTab === "login" ? "text-[#22c55e]" : "text-[#94a3b8] hover:text-[#dde3ed]"
            }`}
          >
            {activeTab === "login" && (
              <TabGlider
                layoutId="auth-tab-glider"
                className="absolute inset-0 bg-[#242a32] rounded-lg -z-10 border border-[#2a3340]"
              />
            )}
            Sign In
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer relative select-none ${
              activeTab === "register" ? "text-[#22c55e]" : "text-[#94a3b8] hover:text-[#dde3ed]"
            }`}
          >
            {activeTab === "register" && (
              <TabGlider
                layoutId="auth-tab-glider"
                className="absolute inset-0 bg-[#242a32] rounded-lg -z-10 border border-[#2a3340]"
              />
            )}
            Create Account
          </button>
        </div>

        {/* Form Body */}
        {activeTab === "login" ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#dde3ed] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="learner@example.com"
                  className="w-full bg-[#161c23] border border-[#2a3340] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#dde3ed] placeholder:text-[#94a3b8]/60 focus:border-[#22c55e] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#dde3ed] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#161c23] border border-[#2a3340] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#dde3ed] placeholder:text-[#94a3b8]/60 focus:border-[#22c55e] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <MotionButton
              type="submit"
              variant="primary"
              size="md"
              disabled={isLoading}
              className="w-full mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? "Signing in..." : "Sign In to Account"}</span>
            </MotionButton>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#dde3ed] mb-1">
                Full Name / Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Miller"
                  className="w-full bg-[#161c23] border border-[#2a3340] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#dde3ed] placeholder:text-[#94a3b8]/60 focus:border-[#22c55e] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#dde3ed] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="learner@example.com"
                  className="w-full bg-[#161c23] border border-[#2a3340] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#dde3ed] placeholder:text-[#94a3b8]/60 focus:border-[#22c55e] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#dde3ed] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-[#161c23] border border-[#2a3340] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#dde3ed] placeholder:text-[#94a3b8]/60 focus:border-[#22c55e] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <MotionButton
              type="submit"
              variant="primary"
              size="md"
              disabled={isLoading}
              className="w-full mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isLoading ? "Creating..." : "Create Free Account"}</span>
            </MotionButton>
          </form>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-[#2a3340]"></div>
          <span className="text-[11px] uppercase tracking-wider text-[#94a3b8] font-medium">
            or instant access
          </span>
          <div className="flex-1 h-px bg-[#2a3340]"></div>
        </div>

        {/* Guest Start Button */}
        <button
          type="button"
          onClick={handleGuestQuickStart}
          className="w-full py-2.5 px-4 rounded-xl border border-[#2a3340] bg-[#1a2027] hover:bg-[#242a32] text-xs font-semibold text-[#dde3ed] transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#eab308]" />
          <span>Continue as Guest (Zero-Friction Access)</span>
        </button>
      </div>
    </MotionModal>
  );
}
