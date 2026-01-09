import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, Star } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { clearTokens } from "../../lib/auth";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({ name: "" });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "feedback" | "contact" | "danger">("profile");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Feedback form state
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 0,
    comment: "",
  });
  
  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const res = await api.get("/users/me");
      return res.data.data;
    },
  });

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name || "" });
      setContactForm((prev) => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const res = await api.put("/users/me", profileForm);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "me"] });
      toast.success("Profile updated successfully");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to update profile"));
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error("Passwords do not match");
      }
      if (passwordForm.newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      try {
        const res = await api.put("/users/me/password", {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        });
        return res.data;
      } catch (error: any) {
        // Check if it's a 401 error (wrong password) - don't logout for password change
        if (error.response?.status === 401 || error.response?.data?.code === 401 || error.skipLogout) {
          // For password change, a 401 means wrong current password, not invalid session
          // Throw a specific error that won't trigger logout
          const err = new Error(error.response?.data?.message || error.message || "Current password is incorrect");
          (err as any).skipLogout = true;
          throw err;
        }
        throw error;
      }
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      toast.success("Password changed successfully");
    },
    onError: (error: any) => {
      // Only show error toast, don't logout
      const message = error.skipLogout 
        ? error.message 
        : extractErrorMessage(error, "Failed to change password");
      toast.error(message);
    },
  });

  const submitFeedback = useMutation({
    mutationFn: async () => {
      if (feedbackForm.rating === 0 && !feedbackForm.comment.trim()) {
        throw new Error("Please provide a rating or comment");
      }
      const res = await api.post("/feedback", {
        type: "general",
        stars: feedbackForm.rating > 0 ? feedbackForm.rating : null,
        comment: feedbackForm.comment.trim() || null,
      });
      return res.data;
    },
    onSuccess: () => {
      setFeedbackForm({ rating: 0, comment: "" });
      toast.success("Feedback submitted successfully! Thank you for your input.");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to submit feedback"));
    },
  });

  const submitContact = useMutation({
    mutationFn: async () => {
      if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
        throw new Error("Name, email, and message are required");
      }
      const res = await api.post("/contact", {
        name: contactForm.name.trim(),
        email: contactForm.email.trim(),
        subject: contactForm.subject.trim() || undefined,
        message: contactForm.message.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      setContactForm((prev) => ({
        ...prev,
        subject: "",
        message: "",
      }));
      toast.success("Message sent successfully! We'll get back to you soon.");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to send message"));
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      if (deleteConfirmText !== "DELETE") {
        throw new Error("Please type DELETE to confirm");
      }
      const res = await api.delete("/users/account");
      return res.data;
    },
    onSuccess: () => {
      clearTokens();
      queryClient.clear();
      toast.success("Account deleted successfully");
      navigate("/", { replace: true });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to delete account"));
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    },
  });


  return (
    <div className="flex items-center justify-center min-h-full p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account settings</p>
        </div>

      {isLoadingUser ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">Loading settings...</div>
        </div>
      ) : (
        <>
          <div className="flex gap-4 border-b border-border">
            <button
              onClick={() => setActiveTab("profile")}
              className={`pb-2 px-4 font-medium ${
                activeTab === "profile"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab("password")}
              className={`pb-2 px-4 font-medium ${
                activeTab === "password"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Change Password
            </button>
            <button
              onClick={() => setActiveTab("feedback")}
              className={`pb-2 px-4 font-medium ${
                activeTab === "feedback"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Feedback
            </button>
            <button
              onClick={() => setActiveTab("contact")}
              className={`pb-2 px-4 font-medium ${
                activeTab === "contact"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Contact Us
            </button>
            <button
              onClick={() => setActiveTab("danger")}
              className={`pb-2 px-4 font-medium ${
                activeTab === "danger"
                  ? "border-b-2 border-red-500 text-red-500"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Delete Account
            </button>
          </div>

          {activeTab === "profile" && (
            <Card title="Update Profile">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  updateProfile.mutate();
                }}
              >
                <label className="space-y-1 text-sm font-medium">
                  Name
                  <input
                    type="text"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </label>
                <div className="space-y-1 text-sm font-medium">
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-muted-foreground">
                    {user?.email || "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed. Contact support if you need to update your email address.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {updateProfile.isPending ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </Card>
          )}

          {activeTab === "password" && (
        <Card title="Change Password">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              changePassword.mutate();
            }}
          >
            <label className="space-y-1 text-sm font-medium relative">
              Current Password
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-10"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="space-y-1 text-sm font-medium relative">
              New Password
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-10"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="space-y-1 text-sm font-medium relative">
              Confirm New Password
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-10"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <button
              type="submit"
              disabled={changePassword.isPending}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {changePassword.isPending ? "Changing..." : "Change Password"}
            </button>
          </form>
        </Card>
      )}

      {activeTab === "feedback" && (
        <Card title="Feedback">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submitFeedback.mutate();
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Rating (Optional)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackForm((prev) => ({ ...prev, rating: star }))}
                    className={`p-2 rounded-lg transition ${
                      feedbackForm.rating >= star
                        ? "text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20"
                        : "text-gray-300 hover:text-yellow-300"
                    }`}
                  >
                    <Star
                      className={`h-6 w-6 ${feedbackForm.rating >= star ? "fill-current" : ""}`}
                    />
                  </button>
                ))}
              </div>
              {feedbackForm.rating > 0 && (
                <p className="text-xs text-muted-foreground">
                  {feedbackForm.rating} out of 5 stars
                </p>
              )}
            </div>

            <label className="space-y-1 text-sm font-medium">
              Comments
              <textarea
                className="w-full rounded-xl border border-border bg-background px-3 py-2 min-h-[120px] resize-y"
                value={feedbackForm.comment}
                onChange={(e) => setFeedbackForm((prev) => ({ ...prev, comment: e.target.value }))}
                placeholder="Share your thoughts, suggestions, or feedback..."
              />
            </label>

            <p className="text-xs text-muted-foreground">
              {feedbackForm.rating === 0 && !feedbackForm.comment.trim()
                ? "Please provide a rating or comment"
                : "Thank you for your feedback!"}
            </p>

            <button
              type="submit"
              disabled={submitFeedback.isPending || (feedbackForm.rating === 0 && !feedbackForm.comment.trim())}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitFeedback.isPending ? "Submitting..." : "Submit Feedback"}
            </button>
          </form>
        </Card>
      )}

      {activeTab === "contact" && (
        <Card title="Contact Us">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submitContact.mutate();
            }}
          >
            <label className="space-y-1 text-sm font-medium">
              Name
              <input
                type="text"
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={contactForm.name}
                onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>

            <label className="space-y-1 text-sm font-medium">
              Email
              <input
                type="email"
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={contactForm.email}
                onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </label>

            <label className="space-y-1 text-sm font-medium">
              Subject (Optional)
              <input
                type="text"
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={contactForm.subject}
                onChange={(e) => setContactForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="What is this regarding?"
              />
            </label>

            <label className="space-y-1 text-sm font-medium">
              Message
              <textarea
                className="w-full rounded-xl border border-border bg-background px-3 py-2 min-h-[150px] resize-y"
                value={contactForm.message}
                onChange={(e) => setContactForm((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="How can we help you?"
                required
              />
            </label>

            <button
              type="submit"
              disabled={submitContact.isPending || !contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitContact.isPending ? "Sending..." : "Send Message"}
            </button>
          </form>
        </Card>
      )}

      {activeTab === "danger" && (
        <Card title="Danger Zone">
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                Delete Account
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                Once you delete your account, there is no going back. This action cannot be undone.
                All your data, threads, and messages will be permanently deleted.
              </p>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm transition"
                >
                  Delete Account
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                    Type <span className="font-mono bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">DELETE</span> to confirm:
                  </p>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteAccount.mutate()}
                      disabled={deleteConfirmText !== "DELETE" || deleteAccount.isPending}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition"
                    >
                      {deleteAccount.isPending ? "Deleting..." : "Confirm Delete"}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText("");
                      }}
                      disabled={deleteAccount.isPending}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-800 dark:text-gray-200 font-medium rounded-lg text-sm transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
        </>
      )}
      </div>
    </div>
  );
}
