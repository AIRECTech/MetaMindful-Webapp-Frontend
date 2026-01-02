import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { api } from "../lib/api";
import { extractErrorMessage } from "../lib/errors";

const options = [
  { id: "sleep", label: "Sleep issue", icon: "😴" },
  { id: "stress", label: "Stress", icon: "😰" },
  { id: "stuck", label: "I am stuck", icon: "🤔" },
  { id: "focus", label: "Can't focus", icon: "🎯" },
  { id: "overthinking", label: "Overthinking", icon: "🌀" },
  { id: "anxiety", label: "Anxiety", icon: "😟" },
];

export function WelcomePage() {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const startChat = useMutation({
    mutationFn: async (message: string) => {
      const res = await api.post("/threads/chat", {
        message,
        title: message,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      if (data.threadId) {
        navigate(`/chat/${data.threadId}`);
      }
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to start chat"));
    },
  });

  const handleOptionClick = (option: { label: string }) => {
    setSelectedOption(option.label);
    startChat.mutate(option.label);
  };

  const handleTalkClick = () => {
    navigate("/chat/new");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Welcome to MetaMindful
          </h1>
          <p className="text-lg text-gray-600">
            Where do you want to start? Pick one from these or just start and MetaMindful can take you from there:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option)}
              disabled={startChat.isPending}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-4xl">{option.icon}</span>
              <span className="text-gray-700 font-medium">{option.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleTalkClick}
          disabled={startChat.isPending}
          className="mx-auto px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-semibold rounded-full text-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          Talk to MetaMindful
        </button>
      </div>
    </div>
  );
}
