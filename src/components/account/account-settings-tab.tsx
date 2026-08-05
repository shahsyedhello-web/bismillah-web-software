import React, { useState } from "react";
import {
  User,
  Phone,
  Mail,
  Lock,
  Globe,
  Bell,
  CheckCircle2,
  ShieldCheck,
  Camera,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";

export function AccountSettingsTab() {
  const { profile, user, updateProfile, updatePassword } = useAuth();

  // Profile Form
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [email] = useState(profile?.email || user?.email || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [preferredLanguage, setPreferredLanguage] = useState(
    profile?.preferred_language || "English",
  );
  const [notifPrefs, setNotifPrefs] = useState(
    profile?.notification_preferences || {
      email_updates: true,
      whatsapp_updates: true,
      promotional_offers: true,
      stock_alerts: true,
    },
  );
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [updatingPass, setUpdatingPass] = useState(false);

  // Password Strength Calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-gray-200" };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 25, label: "Weak", color: "bg-rose-500" };
    if (score === 2) return { score: 50, label: "Fair", color: "bg-amber-500" };
    if (score === 3) return { score: 75, label: "Good", color: "bg-blue-500" };
    return { score: 100, label: "Strong", color: "bg-emerald-500" };
  };

  const passStrength = getPasswordStrength(newPassword);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { error } = await updateProfile({
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        phone,
        avatar_url: avatarUrl,
        preferred_language: preferredLanguage,
        notification_preferences: notifPrefs,
      });

      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update profile settings.";
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setUpdatingPass(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw error;
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update password.";
      toast.error(message);
    } finally {
      setUpdatingPass(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="pb-4 border-b border-border">
        <h2 className="font-display text-xl font-bold text-foreground">
          Account Settings & Security
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your personal details, login credentials, language, and notification preferences
        </p>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Profile Picture & Personal Info */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Personal Information
          </h3>

          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border/70">
            <div className="relative h-20 w-20 shrink-0 rounded-full bg-accent ring-4 ring-primary/20 overflow-hidden flex items-center justify-center font-display text-3xl font-bold text-primary">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span>{(firstName[0] || user?.email?.[0] || "U").toUpperCase()}</span>
              )}
            </div>

            <div className="flex-1 space-y-2 w-full text-xs">
              <label className="font-semibold text-foreground block">Avatar Image URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`)
                  }
                  className="rounded-xl border border-border bg-accent px-3 py-2 text-xs font-semibold hover:bg-muted"
                >
                  Generate
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Paste an image web URL or click Generate for a custom avatar.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-foreground block mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="012345678910"
                  className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Email Address (Primary Login)
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full rounded-xl border border-border bg-muted/50 pl-10 pr-4 py-2.5 text-xs text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preferred Language & Regional Settings */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Preferred Language
          </h3>

          <div className="grid grid-cols-2 gap-3 max-w-sm">
            {(["English", "Urdu"] as const).map((lang) => (
              <button
                type="button"
                key={lang}
                onClick={() => setPreferredLanguage(lang)}
                className={`py-3 rounded-2xl border text-xs font-bold transition-all ${
                  preferredLanguage === lang
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background border-border text-foreground hover:bg-accent"
                }`}
              >
                {lang === "Urdu" ? "اردو (Urdu)" : "English"}
              </button>
            ))}
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Notification Preferences
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-2xl border border-border hover:bg-accent/40 cursor-pointer">
              <div>
                <p className="font-semibold text-foreground">WhatsApp & SMS Order Updates</p>
                <p className="text-muted-foreground text-[11px]">
                  Receive real-time dispatch and rider tracking links on WhatsApp.
                </p>
              </div>
              <input
                type="checkbox"
                checked={notifPrefs.whatsapp_updates}
                onChange={(e) =>
                  setNotifPrefs({ ...notifPrefs, whatsapp_updates: e.target.checked })
                }
                className="h-4 w-4 rounded text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl border border-border hover:bg-accent/40 cursor-pointer">
              <div>
                <p className="font-semibold text-foreground">Email Invoices & Receipts</p>
                <p className="text-muted-foreground text-[11px]">
                  Get PDF invoice copies automatically sent to your registered email.
                </p>
              </div>
              <input
                type="checkbox"
                checked={notifPrefs.email_updates}
                onChange={(e) => setNotifPrefs({ ...notifPrefs, email_updates: e.target.checked })}
                className="h-4 w-4 rounded text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl border border-border hover:bg-accent/40 cursor-pointer">
              <div>
                <p className="font-semibold text-foreground">
                  Special Coupons & Seasonal Discounts
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Exclusive offers on Ghee, Butter, Cream & Wholesale Bulk deals.
                </p>
              </div>
              <input
                type="checkbox"
                checked={notifPrefs.promotional_offers}
                onChange={(e) =>
                  setNotifPrefs({ ...notifPrefs, promotional_offers: e.target.checked })
                }
                className="h-4 w-4 rounded text-primary focus:ring-primary"
              />
            </label>
          </div>
        </div>

        {/* Save Profile Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {savingProfile ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes…
              </>
            ) : (
              "Save Profile Settings"
            )}
          </button>
        </div>
      </form>

      {/* Change Password Section */}
      <form
        onSubmit={handleChangePassword}
        className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4"
      >
        <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" /> Password & Security
        </h3>

        <div className="space-y-4 max-w-md text-xs">
          <div>
            <label className="font-semibold text-foreground block mb-1">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPass ? "text" : "password"}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-border bg-background pl-10 pr-10 py-2.5 text-xs focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Strength:</span>
                  <span className="font-bold">{passStrength.label}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${passStrength.color}`}
                    style={{ width: `${passStrength.score}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPass ? "text" : "password"}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-xl border border-border bg-background pl-10 pr-10 py-2.5 text-xs focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={updatingPass}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-6 py-2.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
          >
            {updatingPass ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
