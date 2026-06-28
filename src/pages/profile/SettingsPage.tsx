import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Star, Calendar } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { clearTokens, isGuestUser } from "../../lib/auth";
import { logAnalyticsEvent } from "../../lib/firebase";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isGuest = isGuestUser();
  const [activeTab, setActiveTab] = useState<"feedback" | "contact" | "danger">("feedback");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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

  const { data: user, isLoading: isLoadingUserQuery } = useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const res = await api.get("/users/me");
      return res.data.data;
    },
    enabled: !isGuest,
  });

  const isLoadingUser = !isGuest && isLoadingUserQuery;

  // Fetch user's feedbacks
  const { data: feedbacksData, isLoading: isLoadingFeedbacks } = useQuery({
    queryKey: ["feedbacks", "general"],
    queryFn: async () => {
      const res = await api.get("/feedback?type=general&pageSize=50");
      return res.data.data;
    },
    enabled: activeTab === "feedback", // Only fetch when feedback tab is active
  });

  const feedbacks = feedbacksData?.data || [];

  useEffect(() => {
    if (user) {
      setContactForm((prev) => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
      }));
    }
  }, [user]);

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
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
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
      logAnalyticsEvent("delete_account");
      clearTokens();
      queryClient.clear();
      toast.success("Account deleted successfully");
      navigate("/", { replace: true });
    },
    onError: (error) => {
      logAnalyticsEvent("delete_account_failed", { error: extractErrorMessage(error) });
      toast.error(extractErrorMessage(error, "Failed to delete account"));
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    },
  });


  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-start justify-center min-h-full p-6">
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
                  onClick={() => setActiveTab("feedback")}
                  className={`pb-2 px-4 font-medium ${activeTab === "feedback"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Feedback
                </button>
                <button
                  onClick={() => setActiveTab("contact")}
                  className={`pb-2 px-4 font-medium ${activeTab === "contact"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Contact Us
                </button>
                {!isGuest && (
                  <button
                    onClick={() => setActiveTab("danger")}
                    className={`pb-2 px-4 font-medium ${activeTab === "danger"
                        ? "border-b-2 border-red-500 text-red-500"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Delete Account
                  </button>
                )}
              </div>

              {activeTab === "feedback" && (
                <div className="space-y-6">
                  <Card title="Submit Feedback">
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
                              className={`p-2 rounded-lg transition ${feedbackForm.rating >= star
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

                  <Card title="Your Feedback History">
                    {isLoadingFeedbacks ? (
                      <div className="text-center py-8">
                        <div className="text-muted-foreground">Loading feedbacks...</div>
                      </div>
                    ) : feedbacks.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No feedback submitted yet.</p>
                        <p className="text-sm text-muted-foreground mt-2">Submit your first feedback above!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {feedbacks.map((feedback: any) => (
                          <div
                            key={feedback.id}
                            className="border border-border rounded-xl p-4 bg-background hover:bg-muted/50 transition"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {feedback.stars && (
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-4 w-4 ${star <= feedback.stars
                                            ? "text-yellow-400 fill-current"
                                            : "text-gray-300"
                                          }`}
                                      />
                                    ))}
                                  </div>
                                )}
                                <span className="text-xs font-medium text-muted-foreground uppercase">
                                  {feedback.type}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {new Date(feedback.createdAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                            {feedback.comment && (
                              <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">
                                {feedback.comment}
                              </p>
                            )}
                            {!feedback.stars && !feedback.comment && (
                              <p className="text-sm text-muted-foreground italic">No details provided</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
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

              {activeTab === "danger" && !isGuest && (
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
                          onClick={() => {
                            logAnalyticsEvent("delete_account_started");
                            setShowDeleteConfirm(true);
                          }}
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
                                logAnalyticsEvent("delete_account_cancelled");
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
    </div>
  );
}
