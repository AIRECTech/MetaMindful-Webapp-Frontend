import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { clearTokens } from "../../lib/auth";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "danger">("profile");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const res = await api.get("/users/me");
      return res.data.data;
    },
  });

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name, email: user.email });
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
      const res = await api.put("/users/me/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to change password"));
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
                <label className="space-y-1 text-sm font-medium">
                  Email
                  <input
                    type="email"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </label>
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
            <label className="space-y-1 text-sm font-medium">
              Current Password
              <input
                type="password"
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              New Password
              <input
                type="password"
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                required
                minLength={8}
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Confirm New Password
              <input
                type="password"
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                required
                minLength={8}
              />
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
