import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  const { data: user } = useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const res = await api.get("/users/me");
      return res.data.data;
    },
    onSuccess: (data) => {
      setProfileForm({ name: data.name, email: data.email });
    },
  });

  // Note: These mutations require backend endpoints that may not exist yet
  // PUT /users/me for profile update
  // PUT /users/me/password for password change
  const updateProfile = useMutation({
    mutationFn: async () => {
      // This endpoint doesn't exist in the backend yet
      // You'll need to add: router.put("/me", authenticate(), asyncHandler(userController.updateProfile));
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
      // This endpoint doesn't exist in the backend yet
      // You'll need to add: router.put("/me/password", authenticate(), asyncHandler(userController.changeOwnPassword));
      const res = await api.put("/users/me/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      return res.data.data;
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to change password"));
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings</p>
      </div>

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
            <p className="text-xs text-muted-foreground">
              Note: Profile update requires a backend endpoint (PUT /users/me) to be implemented.
            </p>
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
            <p className="text-xs text-muted-foreground">
              Note: Password change requires a backend endpoint (PUT /users/me/password) to be implemented.
            </p>
          </form>
        </Card>
      )}
    </div>
  );
}
