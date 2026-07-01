import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { api } from "../../lib/api";
import { User } from "lucide-react";

export function ProfilePage() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const res = await api.get("/users/me");
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-full p-6">
        <div className="text-center">
          <div className="text-muted-foreground">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-full p-6">
        <div className="text-center">
          <div className="text-muted-foreground">Failed to load profile</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex justify-center items-center">
      <div className="w-full max-w-2xl space-y-6 my-auto">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-1">View your profile information</p>
        </div>

        <Card>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{user.name}</h2>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="mt-1 text-lg">{user.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="mt-1 text-lg">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <p className="mt-1 text-lg capitalize">{user.status}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Type</label>
              <p className="mt-1 text-lg">{user.isGuest ? "Guest" : "Registered"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email Verified</label>
              <p className="mt-1 text-lg">{user.isEmailVerified ? "Yes" : "No"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Member Since</label>
              <p className="mt-1 text-lg">{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </Card>
      </div>
    </div>
  );
}
